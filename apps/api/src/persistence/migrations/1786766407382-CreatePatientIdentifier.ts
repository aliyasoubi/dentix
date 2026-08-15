import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * First piece of R1's fuller patient-registry build that
 * CreatePatients1786220061080 deferred: patient_identifier, national code
 * only for now (01-patient-management.md's "Optional fields" list).
 * Append-only like patient_name/patient_contact — created_at/created_by
 * only, no version/archive columns. No uniqueness constraint on
 * normalized_value: 04-architecture/04-data-model.md calls uniqueness
 * here "policy-controlled", and no office-policy config exists yet to
 * decide it — not built ahead of a proven need.
 */
export class CreatePatientIdentifier1786766407382 implements MigrationInterface {
  name = "CreatePatientIdentifier1786766407382";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patient_identifier" (
        "id"                uuid PRIMARY KEY,
        "patient_id"        uuid NOT NULL REFERENCES "patient" ("id"),
        "identifier_type"   varchar NOT NULL,
        "original_value"    varchar NOT NULL,
        "normalized_value"  varchar NOT NULL,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "created_by"        uuid NOT NULL,
        CONSTRAINT "CK_patient_identifier_type" CHECK ("identifier_type" IN ('national_code'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IX_patient_identifier_patient_id" ON "patient_identifier" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_patient_identifier_normalized_value" ON "patient_identifier" ("normalized_value")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_identifier"`);
  }
}
