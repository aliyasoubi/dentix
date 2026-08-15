import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Retires the single-boolean stopgap from 1786621942309-AddOfficeUserIsAdmin
 * now that DISC-003 is decided and the real role/permission matrix exists
 * (1786735766477-CreateRolePermissions, 1786742747460-SeedDefaultRoles).
 * Who can add an office user is now `user.manage`, resolved fresh per
 * request via AuthorizationPort — nothing reads this column anymore.
 */
export class DropOfficeUserIsAdmin1786751604406 implements MigrationInterface {
  name = "DropOfficeUserIsAdmin1786751604406";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "office_user" DROP COLUMN "is_office_admin"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "office_user"
      ADD COLUMN "is_office_admin" boolean NOT NULL DEFAULT false
    `);
  }
}
