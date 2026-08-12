import "reflect-metadata";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { asUuid, TransactionContext } from "@dentix/kernel";
import { OutboxEvent } from "../../src/modules/outbox/domain/entities/outbox-event.entity";
import { OutboxEventOrmEntity } from "../../src/modules/outbox/infrastructure/persistence/outbox-event.orm-entity";
import { TypeOrmOutboxEventRepository } from "../../src/modules/outbox/infrastructure/persistence/outbox-event.typeorm-repository";
import { TypeOrmUnitOfWork } from "../../src/platform/typeorm-unit-of-work";
import { dataSourceOptions } from "../../src/persistence/data-source";

function fixtureEvent(overrides: Partial<Parameters<typeof OutboxEvent.create>[0]> = {}): OutboxEvent {
  return OutboxEvent.create({
    id: asUuid(randomUUID()),
    eventType: "PatientCreated",
    eventVersion: 1,
    officeId: asUuid(randomUUID()),
    aggregateType: "Patient",
    aggregateId: asUuid(randomUUID()),
    aggregateVersion: 1,
    actorId: asUuid(randomUUID()),
    correlationId: asUuid(randomUUID()),
    causationId: null,
    payload: { patientNumber: 1 },
    now: new Date(),
    ...overrides,
  });
}

// ADR-006 acceptance item 3: "FOR UPDATE SKIP LOCKED outbox claim query
// working under two concurrent workers in an integration test" — proves
// the schema/claim plumbing 00-build-sequencing.md sanctions building now,
// with no publisher/consumer platform (that's R2's BullMQ work) around it.
describe("Outbox claim query (integration)", () => {
  let dataSource: DataSource | undefined;
  let repository: TypeOrmOutboxEventRepository;
  let unitOfWork: TypeOrmUnitOfWork;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
    repository = new TypeOrmOutboxEventRepository(dataSource.getRepository(OutboxEventOrmEntity));
    unitOfWork = new TypeOrmUnitOfWork(dataSource);
  });

  afterEach(async () => {
    await dataSource?.getRepository(OutboxEventOrmEntity).query('TRUNCATE TABLE "outbox_event"');
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("create() persists a row that round-trips through the mapper", async () => {
    const event = fixtureEvent({ eventType: "PatientCreated", payload: { patientNumber: 42 } });
    await repository.create(event);

    const [claimed] = await unitOfWork.runInTransaction((tx) => repository.claimBatch(10, tx));
    expect(claimed?.id).toBe(event.id);
    expect(claimed?.eventType).toBe("PatientCreated");
    expect(claimed?.payload).toEqual({ patientNumber: 42 });
    expect(claimed?.publishedAt).toBeNull();
  });

  it("claimBatch never returns an already-published row", async () => {
    const event = fixtureEvent();
    await repository.create(event);
    await repository.markPublished([event.id], new Date());

    const claimed = await unitOfWork.runInTransaction((tx) => repository.claimBatch(10, tx));
    expect(claimed).toHaveLength(0);
  });

  it(
    "SKIP LOCKED: a concurrent claim neither blocks on, nor re-claims, a row an in-flight " +
      "transaction already claimed — the exact behavior a plain FOR UPDATE would not have",
    async () => {
      const event = fixtureEvent();
      await repository.create(event);

      let releaseWorkerA: () => void = () => {};
      const workerAMayCommit = new Promise<void>((resolve) => {
        releaseWorkerA = resolve;
      });
      let signalWorkerAHasClaimed: () => void = () => {};
      const workerAHasClaimed = new Promise<void>((resolve) => {
        signalWorkerAHasClaimed = resolve;
      });
      let workerAClaimed: OutboxEvent[] = [];

      const workerA = unitOfWork.runInTransaction(async (tx: TransactionContext) => {
        workerAClaimed = await repository.claimBatch(10, tx);
        signalWorkerAHasClaimed();
        // Hold the transaction — and therefore the row lock — open until
        // worker B has had a chance to attempt its own claim.
        await workerAMayCommit;
      });

      // Wait for worker A's claimBatch to actually resolve — its SELECT
      // ... FOR UPDATE has by definition already executed and the row
      // lock is held by that point, so this is a deterministic sync point,
      // not a timing guess (a fixed sleep here would be flaky under load:
      // too short and worker B could race ahead of worker A's SELECT).
      await workerAHasClaimed;

      const workerBClaimed = await unitOfWork.runInTransaction((tx) => repository.claimBatch(10, tx));

      releaseWorkerA();
      await workerA;

      expect(workerAClaimed.map((e) => e.id)).toEqual([event.id]);
      // Not blocked-then-double-claimed once worker A committed — SKIP
      // LOCKED means worker B's claim returns empty immediately instead.
      expect(workerBClaimed).toHaveLength(0);
    },
  );

  it("two concurrent workers claiming from a shared pool partition it with no overlap and no gaps", async () => {
    // Each worker marks its claimed rows published inside the same
    // transaction before committing — realistic "claim then process" usage,
    // and the only thing that gives SKIP LOCKED lasting effect. A claim
    // that never marks anything releases its lock on commit with nothing
    // recorded, so a second worker could legitimately reselect the same
    // rows afterward; that isn't a double-claim bug, it's this test being
    // wrong to assert exclusivity without ever taking the row off the table.
    const events = Array.from({ length: 6 }, () => fixtureEvent());
    await Promise.all(events.map((event) => repository.create(event)));

    async function claimAndPublish(limit: number): Promise<readonly OutboxEvent[]> {
      return unitOfWork.runInTransaction(async (tx) => {
        const claimed = await repository.claimBatch(limit, tx);
        await repository.markPublished(
          claimed.map((e) => e.id),
          new Date(),
          tx,
        );
        return claimed;
      });
    }

    const [claimedA, claimedB] = await Promise.all([claimAndPublish(3), claimAndPublish(3)]);

    const claimedIdsA = claimedA.map((e) => e.id);
    const claimedIdsB = claimedB.map((e) => e.id);
    const overlap = claimedIdsA.filter((id) => claimedIdsB.includes(id));

    expect(overlap).toEqual([]);
    expect(new Set([...claimedIdsA, ...claimedIdsB])).toEqual(new Set(events.map((e) => e.id)));
  });
});
