/**
 * Seeds an office's patient-number counter so new Dentix registrations
 * start above an existing paper/legacy system's already-assigned medical
 * record numbers, instead of colliding with them. Run once, before the
 * office goes live on Dentix — not a repeatable admin feature, because
 * exactly one office needs this exactly once.
 *
 * `patient_number_sequence` (patient.typeorm-repository.ts's
 * nextPatientNumber) is a plain `(office_id, next_number)` UPSERT target
 * that starts unseeded (no row) until the first patient is created for an
 * office, at which point it defaults to 1. This just inserts that row
 * early, with the desired starting value, instead of letting it default.
 * `ON CONFLICT DO NOTHING` makes it safe to re-run: it will never lower an
 * already-seeded (or already-in-use) counter.
 *
 * The office's own patients already known from the prior system are NOT
 * bulk-imported by this script — they're entered into Dentix one at a
 * time, as they next visit, with the receptionist typing their existing
 * number into the optional `patientNumber` field on patient registration
 * (create-patient.use-case.ts's own comment on that field).
 *
 * Usage:
 *   npx ts-node -T scripts/seed-patient-number-sequence.ts <office-code> <starting-number>
 *
 * Example, for an office whose highest already-assigned legacy number is
 * 2500 (so new Dentix patients should start at 2501):
 *   npx ts-node -T scripts/seed-patient-number-sequence.ts main 2501
 */
import "reflect-metadata";
import dataSource from "../src/persistence/data-source";
import { OfficeOrmEntity } from "../src/modules/office-administration/infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "../src/modules/office-administration/infrastructure/persistence/office.typeorm-repository";

async function main() {
  const officeCode = process.argv[2];
  const startingNumberArg = process.argv[3];
  if (!officeCode || !startingNumberArg) {
    console.error("Usage: ts-node scripts/seed-patient-number-sequence.ts <office-code> <starting-number>");
    process.exit(1);
  }
  const startingNumber = Number.parseInt(startingNumberArg, 10);
  if (!Number.isInteger(startingNumber) || startingNumber < 1) {
    console.error(`<starting-number> must be a positive integer, got '${startingNumberArg}'`);
    process.exit(1);
  }

  await dataSource.initialize();

  const officeRepo = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
  const office = await officeRepo.findByCode(officeCode);
  if (!office) {
    console.error(`No office found with code '${officeCode}'`);
    await dataSource.destroy();
    process.exit(1);
  }

  // RETURNING + checking rows.length, not rowCount: an INSERT's raw driver
  // result is the plain rows array (nextPatientNumber's own pattern,
  // one file up) — unlike UPDATE/DELETE, which TypeORM's Postgres driver
  // wraps as a [rows, rowCount] tuple. Relying on rowCount here would
  // silently report "already seeded" on every real run — the same shape
  // of bug the PATCH /patients/:id concurrency fix caught earlier.
  const rows: Array<{ office_id: string }> = await dataSource.query(
    `INSERT INTO "patient_number_sequence" ("office_id", "next_number")
     VALUES ($1, $2)
     ON CONFLICT ("office_id") DO NOTHING
     RETURNING "office_id"`,
    [office.id, startingNumber],
  );

  if (rows.length > 0) {
    console.log(
      `Seeded office '${officeCode}' (${office.id}): next patient number will be ${startingNumber}.`,
    );
  } else {
    const existing: Array<{ next_number: number }> = await dataSource.query(
      `SELECT "next_number" FROM "patient_number_sequence" WHERE "office_id" = $1`,
      [office.id],
    );
    console.log(
      `Office '${officeCode}' already has a patient-number counter (next: ${existing[0]?.next_number}). Not changed — this script never lowers an existing counter.`,
    );
  }

  await dataSource.destroy();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
