import "reflect-metadata";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { asUuid } from "@dentix/kernel";
import { Office } from "../../src/modules/office-administration/domain/entities/office.entity";
import { OfficeOrmEntity } from "../../src/modules/office-administration/infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "../../src/modules/office-administration/infrastructure/persistence/office.typeorm-repository";
import { dataSourceOptions } from "../../src/persistence/data-source";

// Proves ADR-006's migration-only-mode setup end to end against a real
// PostgreSQL 18 (docker-compose), not a mock: migrations apply cleanly,
// the ORM<->domain mapper round-trips, and the DB-level unique constraint
// is real, not just declared in code.
describe("Office persistence (integration)", () => {
  let dataSource: DataSource | undefined;
  let repository: TypeOrmOfficeRepository;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
    repository = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
  });

  afterAll(async () => {
    // Guard: if beforeAll failed before initialize() resolved, dataSource
    // is still assigned (declaration above) but never connected — skip
    // cleanup rather than throwing a confusing secondary error that masks
    // the real failure.
    if (dataSource?.isInitialized) {
      // CASCADE: office_user (identity-access, S3) now has a foreign key to
      // office. A plain TRUNCATE of the referenced table fails outright.
      await dataSource.getRepository(OfficeOrmEntity).query('TRUNCATE TABLE "office" CASCADE');
      await dataSource.destroy();
    }
  });

  it("round-trips an office through the mapper and back", async () => {
    const office = Office.create({
      id: asUuid(randomUUID()),
      code: `test-${randomUUID().slice(0, 8)}`,
      timezone: "Asia/Tehran",
    });

    await repository.create(office);

    const byId = await repository.findById(office.id);
    expect(byId?.code).toBe(office.code);
    expect(byId?.timezone).toBe("Asia/Tehran");
    expect(byId?.isActive).toBe(true);
    // TypeORM's @VersionColumn initializes this on insert; nothing in the
    // mapper sets it manually (regression check for the version-column fix).
    expect(byId?.version).toBe(1);

    const byCode = await repository.findByCode(office.code);
    expect(byCode?.id).toBe(office.id);
  });

  it("enforces the office.code unique constraint at the database level", async () => {
    const code = `dup-${randomUUID().slice(0, 8)}`;
    const first = Office.create({ id: asUuid(randomUUID()), code, timezone: "Asia/Tehran" });
    const second = Office.create({ id: asUuid(randomUUID()), code, timezone: "Asia/Tehran" });

    await repository.create(first);

    await expect(repository.create(second)).rejects.toThrow(/duplicate key value/i);
  });

  it("rejects re-creating the same office id instead of silently overwriting it", async () => {
    // Regression test: create() must be insert-only. The bug this guards
    // against — save() silently overwriting created_at/created_by on a
    // second call for the same row — is exactly what .insert() (used
    // instead of .save() in TypeOrmOfficeRepository) makes impossible.
    const id = asUuid(randomUUID());
    const original = Office.create({ id, code: `orig-${randomUUID().slice(0, 8)}`, timezone: "Asia/Tehran" });
    const impostor = Office.create({
      id,
      code: `impostor-${randomUUID().slice(0, 8)}`,
      timezone: "Asia/Tehran",
    });

    await repository.create(original);

    await expect(repository.create(impostor)).rejects.toThrow(/duplicate key value/i);

    const stillOriginal = await repository.findById(id);
    expect(stillOriginal?.code).toBe(original.code);
  });

  it("returns null, not an error, for a non-existent office", async () => {
    await expect(repository.findById(asUuid(randomUUID()))).resolves.toBeNull();
  });
});
