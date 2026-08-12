import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TransactionContext, Uuid } from "@dentix/kernel";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { OutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { OutboxEventMapper } from "../mappers/outbox-event.mapper";
import { OutboxEventOrmEntity } from "./outbox-event.orm-entity";
import { managerFor, repositoryFor } from "../../../../platform/typeorm-transaction";

/** Raw `.query()` returns the table's actual (snake_case) column names, not the ORM entity's camelCase properties. */
interface OutboxEventRow {
  id: string;
  event_type: string;
  event_version: number;
  occurred_at: Date;
  office_id: string;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: number;
  actor_id: string | null;
  correlation_id: string;
  causation_id: string | null;
  payload: Record<string, unknown>;
  created_at: Date;
  available_at: Date;
  published_at: Date | null;
  attempts: number;
  last_error: string | null;
}

/** Reshapes a raw row into the ORM entity's own (camelCase) shape and hands it to OutboxEventMapper.toDomain — one field mapping to domain, not two independently hand-written ones that could drift. */
function rowToDomain(row: OutboxEventRow): OutboxEvent {
  const record = new OutboxEventOrmEntity();
  record.id = row.id;
  record.eventType = row.event_type;
  record.eventVersion = row.event_version;
  record.occurredAt = row.occurred_at;
  record.officeId = row.office_id;
  record.aggregateType = row.aggregate_type;
  record.aggregateId = row.aggregate_id;
  record.aggregateVersion = row.aggregate_version;
  record.actorId = row.actor_id;
  record.correlationId = row.correlation_id;
  record.causationId = row.causation_id;
  record.payload = row.payload;
  record.createdAt = row.created_at;
  record.availableAt = row.available_at;
  record.publishedAt = row.published_at;
  record.attempts = row.attempts;
  record.lastError = row.last_error;
  return OutboxEventMapper.toDomain(record);
}

@Injectable()
export class TypeOrmOutboxEventRepository implements OutboxEventRepository {
  constructor(
    @InjectRepository(OutboxEventOrmEntity)
    private readonly repository: Repository<OutboxEventOrmEntity>,
  ) {}

  async create(event: OutboxEvent, tx?: TransactionContext): Promise<void> {
    const repo = repositoryFor(this.repository, tx);
    // TypeORM's insert() typing can't structurally verify a jsonb column
    // (`payload: Record<string, unknown>`) against its own deep-partial
    // insert type; deriving the exact parameter type from `repo.insert`
    // itself keeps this narrow and precise instead of reaching for `any`.
    await repo.insert(OutboxEventMapper.toOrm(event) as Parameters<typeof repo.insert>[0]);
  }

  /**
   * ADR-006: raw SQL, not the query builder — the locking behavior this
   * proves (SKIP LOCKED, not the default blocking FOR UPDATE) is exactly
   * the kind of thing a generated query would obscure.
   */
  async claimBatch(limit: number, tx: TransactionContext): Promise<OutboxEvent[]> {
    const manager = managerFor(this.repository.manager, tx);
    const rows = await manager.query<OutboxEventRow[]>(
      `SELECT * FROM "outbox_event"
       WHERE "published_at" IS NULL AND "available_at" <= now()
       ORDER BY "available_at"
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );
    return rows.map(rowToDomain);
  }

  async markPublished(ids: readonly Uuid[], publishedAt: Date, tx?: TransactionContext): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await repositoryFor(this.repository, tx).update({ id: In([...ids]) }, { publishedAt });
  }
}
