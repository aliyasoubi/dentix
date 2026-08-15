import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Second piece of R1's fuller patient-registry build that
 * CreatePatients1786220061080 deferred: patient_address. Unlike
 * patient_name/patient_contact/patient_identifier this is mutable — one
 * current address per patient, full audit column set (04-architecture/
 * 04-data-model.md, "Mutable business records"), no office_id (inherited
 * transitively through patient_id, same as every other patient-child
 * table here). Every field is nullable free text: 01-patient-
 * management.md asks for structure that "remains usable for foreign or
 * nonstandard addresses", so nothing here is Iran-only validated.
 */
export class CreatePatientAddress1786769823994 implements MigrationInterface {
  name = "CreatePatientAddress1786769823994";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patient_address" (
        "id"               uuid PRIMARY KEY,
        "patient_id"       uuid NOT NULL REFERENCES "patient" ("id"),
        "province"         varchar,
        "city"             varchar,
        "district"         varchar,
        "address_line1"    varchar,
        "address_line2"    varchar,
        "postal_code"      varchar,
        "delivery_notes"   varchar,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "created_by"       uuid NOT NULL,
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_by"       uuid NOT NULL,
        "version"          integer NOT NULL DEFAULT 1,
        "archived_at"      timestamptz,
        "archived_by"      uuid,
        CONSTRAINT "UQ_patient_address_patient_id" UNIQUE ("patient_id")
      )
    `);
    // No separate index on patient_id: the UNIQUE constraint above already
    // creates one, unlike patient_contact/patient_identifier where
    // patient_id isn't unique (multiple rows per patient are allowed there).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_address"`);
  }
}
