import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Product-owner-directed field additions (2026-08-17, alongside the
 * patient detail page): `occupation` and `referral_source` are plain
 * optional free text on `patient`, the same shape address's own optional
 * fields already take. `preferred_language` is stored with a fixed
 * default rather than left unset — ADR-012's hedge for a second locale
 * existing someday — but has exactly one valid value today, so it ships
 * with no UI control to choose it (there is nothing to choose yet).
 *
 * `patient_contact`'s CHECK constraint widens to allow 'email' alongside
 * 'mobile_phone' — same drop/recreate technique
 * AddPatientNationalityAndPassport1786956918775 used, Postgres having no
 * ALTER CHECK CONSTRAINT.
 */
export class AddPatientOccupationReferralLanguageAndEmailContact1786963012000 implements MigrationInterface {
  name = "AddPatientOccupationReferralLanguageAndEmailContact1786963012000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "patient" ADD COLUMN "occupation" varchar`);
    await queryRunner.query(`ALTER TABLE "patient" ADD COLUMN "referral_source" varchar`);

    await queryRunner.query(`
      ALTER TABLE "patient"
      ADD COLUMN "preferred_language" varchar NOT NULL DEFAULT 'fa-IR'
    `);
    await queryRunner.query(`
      ALTER TABLE "patient"
      ADD CONSTRAINT "CK_patient_preferred_language" CHECK ("preferred_language" IN ('fa-IR'))
    `);

    await queryRunner.query(`ALTER TABLE "patient_contact" DROP CONSTRAINT "CK_patient_contact_type"`);
    await queryRunner.query(`
      ALTER TABLE "patient_contact"
      ADD CONSTRAINT "CK_patient_contact_type" CHECK ("contact_type" IN ('mobile_phone', 'email'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Assumes no 'email' rows exist yet — re-adding the narrower constraint
    // fails loudly on a real constraint violation if any do, matching
    // AddPatientNationalityAndPassport1786956918775's own down() reasoning.
    await queryRunner.query(`ALTER TABLE "patient_contact" DROP CONSTRAINT "CK_patient_contact_type"`);
    await queryRunner.query(`
      ALTER TABLE "patient_contact"
      ADD CONSTRAINT "CK_patient_contact_type" CHECK ("contact_type" IN ('mobile_phone'))
    `);

    await queryRunner.query(`ALTER TABLE "patient" DROP CONSTRAINT "CK_patient_preferred_language"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "preferred_language"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "referral_source"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "occupation"`);
  }
}
