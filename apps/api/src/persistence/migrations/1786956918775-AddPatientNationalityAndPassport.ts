import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * International-patient support: a `nationality` column on `patient`
 * (default 'iranian' — the predominant case for this office; a foreign
 * patient is an explicit choice, never inferred), and widening
 * patient_identifier's CHECK constraint to allow 'passport' alongside
 * 'national_code'. Which document CreatePatientUseCase asks for and
 * validates is driven by nationality — see Patient.nationality and
 * PatientIdentifier.create()'s own comments.
 *
 * Postgres has no ALTER CHECK CONSTRAINT — the existing constraint is
 * dropped and recreated with the wider value list, not touched in place.
 */
export class AddPatientNationalityAndPassport1786956918775 implements MigrationInterface {
  name = "AddPatientNationalityAndPassport1786956918775";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patient"
      ADD COLUMN "nationality" varchar NOT NULL DEFAULT 'iranian'
    `);
    await queryRunner.query(`
      ALTER TABLE "patient"
      ADD CONSTRAINT "CK_patient_nationality" CHECK ("nationality" IN ('iranian', 'foreign'))
    `);

    await queryRunner.query(`
      ALTER TABLE "patient_identifier"
      DROP CONSTRAINT "CK_patient_identifier_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_identifier"
      ADD CONSTRAINT "CK_patient_identifier_type" CHECK ("identifier_type" IN ('national_code', 'passport'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Assumes no 'passport' rows exist yet — re-adding the narrower
    // constraint will fail with a real, loud constraint-violation error if
    // any do, rather than silently truncating data. Acceptable for a
    // feature this fresh; not a general-purpose safe-downgrade path.
    await queryRunner.query(`
      ALTER TABLE "patient_identifier"
      DROP CONSTRAINT "CK_patient_identifier_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_identifier"
      ADD CONSTRAINT "CK_patient_identifier_type" CHECK ("identifier_type" IN ('national_code'))
    `);

    await queryRunner.query(`ALTER TABLE "patient" DROP CONSTRAINT "CK_patient_nationality"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "nationality"`);
  }
}
