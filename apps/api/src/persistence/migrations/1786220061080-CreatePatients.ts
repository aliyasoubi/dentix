import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * S4 (02-requirements/01-patient-management.md, minimal subset per
 * 08-implementation/02-slices-release-0.5.md): patient identity, native +
 * optional Latin name, a single mobile-phone contact. Deliberately NOT
 * built here — deferred to R1's fuller patient-registry build per
 * 07-plans/00-build-sequencing.md: patient_identifier, patient_address,
 * related_person/patient_relationship, patient_alert(_acknowledgment),
 * patient_alias, the merge tables, and multi-type/multi-value contacts
 * (email, home/work phone, preferred+unavailable flags per contact).
 *
 * date_of_birth is nullable and uncollected by S4's UI on purpose — the
 * Jalali date picker doesn't exist until S5; the column is here now so S5
 * only has to add UI, not another migration.
 *
 * patient gets the full mutable-audit-column set (04-data-model.md,
 * "Audit columns"); patient_name/patient_contact are append-only
 * (insert new + flip is_current/is_preferred, never update in place —
 * same reasoning as oidc_authorization_request), so they only get
 * created_at/created_by, no version/archive columns.
 */
export class CreatePatients1786220061080 implements MigrationInterface {
  name = "CreatePatients1786220061080";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patient" (
        "id"                      uuid PRIMARY KEY,
        "office_id"               uuid NOT NULL REFERENCES "office" ("id"),
        "patient_number"          integer NOT NULL,
        "status"                  varchar NOT NULL DEFAULT 'active',
        "date_of_birth"           date,
        "sex"                     varchar NOT NULL DEFAULT 'unspecified',
        "contact_unavailable"     boolean NOT NULL DEFAULT false,
        "created_at"              timestamptz NOT NULL DEFAULT now(),
        "created_by"              uuid NOT NULL,
        "updated_at"              timestamptz NOT NULL DEFAULT now(),
        "updated_by"              uuid NOT NULL,
        "version"                 integer NOT NULL DEFAULT 1,
        "archived_at"             timestamptz,
        "archived_by"             uuid,
        CONSTRAINT "UQ_patient_office_patient_number" UNIQUE ("office_id", "patient_number"),
        CONSTRAINT "CK_patient_status" CHECK (
          "status" IN ('active', 'inactive', 'deceased', 'duplicate_candidate', 'archived')
        ),
        CONSTRAINT "CK_patient_sex" CHECK ("sex" IN ('male', 'female', 'unspecified'))
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_patient_office_id" ON "patient" ("office_id")`);

    // Per-office monotonic counter for patient_number, incremented with a
    // single atomic UPSERT (application-side) — never read-then-increment,
    // which would race under concurrent creates.
    await queryRunner.query(`
      CREATE TABLE "patient_number_sequence" (
        "office_id"    uuid PRIMARY KEY REFERENCES "office" ("id"),
        "next_number"  integer NOT NULL DEFAULT 1
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "patient_name" (
        "id"                uuid PRIMARY KEY,
        "patient_id"        uuid NOT NULL REFERENCES "patient" ("id"),
        "name_type"         varchar NOT NULL,
        "original_value"    varchar NOT NULL,
        "normalized_value"  varchar NOT NULL,
        "is_current"        boolean NOT NULL DEFAULT true,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "created_by"        uuid NOT NULL,
        CONSTRAINT "CK_patient_name_type" CHECK ("name_type" IN ('native', 'latin'))
      )
    `);
    await queryRunner.query(`CREATE INDEX "IX_patient_name_patient_id" ON "patient_name" ("patient_id")`);
    await queryRunner.query(
      `CREATE INDEX "IX_patient_name_normalized_value" ON "patient_name" ("normalized_value")`,
    );

    await queryRunner.query(`
      CREATE TABLE "patient_contact" (
        "id"                uuid PRIMARY KEY,
        "patient_id"        uuid NOT NULL REFERENCES "patient" ("id"),
        "contact_type"      varchar NOT NULL,
        "original_value"    varchar NOT NULL,
        "normalized_value"  varchar NOT NULL,
        "is_preferred"      boolean NOT NULL DEFAULT true,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "created_by"        uuid NOT NULL,
        CONSTRAINT "CK_patient_contact_type" CHECK ("contact_type" IN ('mobile_phone'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IX_patient_contact_patient_id" ON "patient_contact" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IX_patient_contact_normalized_value" ON "patient_contact" ("normalized_value")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "patient_contact"`);
    await queryRunner.query(`DROP TABLE "patient_name"`);
    await queryRunner.query(`DROP TABLE "patient_number_sequence"`);
    await queryRunner.query(`DROP TABLE "patient"`);
  }
}
