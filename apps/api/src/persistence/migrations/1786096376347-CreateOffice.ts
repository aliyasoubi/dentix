import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * First migration in the system (ADR-006 proof). Creates the tenant-root
 * `office` table per 04-architecture/04-data-model.md's Office
 * Administration section and the standard audit-column convention.
 *
 * `created_by`/`updated_by`/`archived_by` are plain nullable uuid columns,
 * not foreign keys yet: `user_account` doesn't exist until S3
 * (identity-access). A later migration adds the FK once that table exists
 * — additive, expand-and-contract, per 06-operations/01-deployment.md's
 * migration policy.
 */
export class CreateOffice1786096376347 implements MigrationInterface {
  name = "CreateOffice1786096376347";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "office" (
        "id"          uuid PRIMARY KEY,
        "code"        varchar NOT NULL,
        "timezone"    varchar NOT NULL,
        "is_active"   boolean NOT NULL DEFAULT true,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "created_by"  uuid,
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_by"  uuid,
        "version"     integer NOT NULL DEFAULT 1,
        "archived_at" timestamptz,
        "archived_by" uuid,
        CONSTRAINT "UQ_office_code" UNIQUE ("code")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "office"`);
  }
}
