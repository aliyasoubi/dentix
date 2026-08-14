import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";
import { DEFAULT_ROLE_DEFINITIONS } from "../../modules/identity-access/domain/value-objects/default-role-definitions";

/**
 * Seeds the six default roles for every office that exists at migration
 * time — in practice, today, just "main". The grant data itself lives in
 * default-role-definitions.ts, not here: that file is also what
 * SeedDefaultRolesUseCase runs against for offices created *after* this
 * migration, and a future "create office" flow calls the same use case —
 * one seed list, not two copies that could quietly drift apart.
 *
 * Deliberately a separate migration from the schema itself
 * (1786735766477): schema and data changes stay independently revertable.
 */
export class SeedDefaultRoles1786742747460 implements MigrationInterface {
  name = "SeedDefaultRoles1786742747460";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const offices = (await queryRunner.query(`SELECT "id" FROM "office"`)) as ReadonlyArray<{ id: string }>;
    const permissions = (await queryRunner.query(`SELECT "id", "code" FROM "permission"`)) as ReadonlyArray<{
      id: string;
      code: string;
    }>;
    const permissionIdByCode = new Map(permissions.map((p) => [p.code, p.id]));

    for (const office of offices) {
      for (const definition of DEFAULT_ROLE_DEFINITIONS) {
        const roleId = randomUUID();
        await queryRunner.query(
          `INSERT INTO "role" ("id", "office_id", "code", "name") VALUES ($1, $2, $3, $4)`,
          [roleId, office.id, definition.code, definition.name],
        );

        for (const permissionCode of definition.permissions) {
          const permissionId = permissionIdByCode.get(permissionCode);
          if (!permissionId) {
            throw new Error(
              `SeedDefaultRoles: role '${definition.code}' references unknown permission code '${permissionCode}'`,
            );
          }
          await queryRunner.query(
            `INSERT INTO "role_permission" ("id", "role_id", "permission_id") VALUES ($1, $2, $3)`,
            [randomUUID(), roleId, permissionId],
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = DEFAULT_ROLE_DEFINITIONS.map((d) => d.code);
    const roles = (await queryRunner.query(`SELECT "id" FROM "role" WHERE "code" = ANY($1)`, [
      codes,
    ])) as ReadonlyArray<{ id: string }>;
    const roleIds = roles.map((r) => r.id);
    if (roleIds.length > 0) {
      await queryRunner.query(`DELETE FROM "role_permission" WHERE "role_id" = ANY($1)`, [roleIds]);
      await queryRunner.query(`DELETE FROM "role" WHERE "id" = ANY($1)`, [roleIds]);
    }
  }
}
