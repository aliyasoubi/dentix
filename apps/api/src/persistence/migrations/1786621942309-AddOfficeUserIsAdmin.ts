import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The minimal, deliberately narrow authorization step before the real
 * role/permission matrix: 01-product/04-roles-and-permissions.md's six
 * roles and dozens of permission families are Release 1 scope
 * (07-plans/release-1-foundation.md) and gated on DISC-003 (an
 * operational/clinical approver has not signed off on that matrix yet —
 * see docs/open-decisions.md). Building the full system now would be
 * getting ahead of both the sequencing plan and that governance gate.
 *
 * What IS needed now: something has to gate who can add a new office user
 * at all, since that action is being exposed for the first time (see the
 * AddOfficeUserUseCase this column backs). A single boolean is that gate —
 * not a role code, not a permission table — precisely so it reads as the
 * stopgap it is rather than getting mistaken for the target design later.
 */
export class AddOfficeUserIsAdmin1786621942309 implements MigrationInterface {
  name = "AddOfficeUserIsAdmin1786621942309";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "office_user"
      ADD COLUMN "is_office_admin" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "office_user" DROP COLUMN "is_office_admin"`);
  }
}
