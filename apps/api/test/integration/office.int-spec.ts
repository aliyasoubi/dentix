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
  let dataSource: DataSource;
  let repository: TypeOrmOfficeRepository;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
    repository = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
  });

  afterAll(async () => {
    await dataSource.getRepository(OfficeOrmEntity).query('TRUNCATE TABLE "office"');
    await dataSource.destroy();
  });

  it("round-trips an office through the mapper and back", async () => {
    const office = Office.create({
      id: asUuid(randomUUID()),
      code: `test-${randomUUID().slice(0, 8)}`,
      timezone: "Asia/Tehran",
    });

    await repository.save(office);

    const byId = await repository.findById(office.id);
    expect(byId?.code).toBe(office.code);
    expect(byId?.timezone).toBe("Asia/Tehran");
    expect(byId?.isActive).toBe(true);

    const byCode = await repository.findByCode(office.code);
    expect(byCode?.id).toBe(office.id);
  });

  it("enforces the office.code unique constraint at the database level", async () => {
    const code = `dup-${randomUUID().slice(0, 8)}`;
    const first = Office.create({ id: asUuid(randomUUID()), code, timezone: "Asia/Tehran" });
    const second = Office.create({ id: asUuid(randomUUID()), code, timezone: "Asia/Tehran" });

    await repository.save(first);

    await expect(repository.save(second)).rejects.toThrow(/duplicate key value/i);
  });

  it("returns null, not an error, for a non-existent office", async () => {
    await expect(repository.findById(asUuid(randomUUID()))).resolves.toBeNull();
  });
});
