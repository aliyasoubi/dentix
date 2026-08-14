import { Inject, Injectable } from "@nestjs/common";
import { asUuid, TransactionContext, Uuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { Role } from "../../domain/entities/role.entity";
import { DEFAULT_ROLE_DEFINITIONS } from "../../domain/value-objects/default-role-definitions";
import { PERMISSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import type { PermissionRepository } from "../../domain/repositories/permission.repository";
import { ROLE_REPOSITORY } from "../../domain/repositories/role.repository";
import type { RoleRepository } from "../../domain/repositories/role.repository";
import { ROLE_PERMISSION_REPOSITORY } from "../../domain/repositories/role-permission.repository";
import type { RolePermissionRepository } from "../../domain/repositories/role-permission.repository";

/**
 * The reusable half of what migration 1786742747460 does inline for
 * offices that already existed at migration time: create the six default
 * roles and their grants for one office, from the same
 * DEFAULT_ROLE_DEFINITIONS list the migration reads. Exists so a future
 * "create office" flow has a real seeding call to make instead of a new
 * office silently starting with zero roles — that gap was named plainly
 * in this migration's own history rather than left implicit. Not wired
 * into an office-creation use case yet, because no such use case exists
 * yet either; this is the piece that was missing to build one.
 */
@Injectable()
export class SeedDefaultRolesUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermissions: RolePermissionRepository,
  ) {}

  async execute(params: { readonly officeId: Uuid }, tx?: TransactionContext): Promise<void> {
    const allPermissions = await this.permissions.findAll();
    const idByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

    for (const definition of DEFAULT_ROLE_DEFINITIONS) {
      const role = Role.create({
        id: asUuid(randomUUID()),
        officeId: params.officeId,
        code: definition.code,
        name: definition.name,
      });
      await this.roles.create(role, null, tx);

      for (const permissionCode of definition.permissions) {
        const permissionId = idByCode.get(permissionCode);
        if (!permissionId) {
          // The migration seeds `permission` before this can ever run
          // against real data — reaching this means that invariant broke,
          // not a normal runtime condition to recover from.
          throw new Error(`SeedDefaultRolesUseCase: unknown permission code '${permissionCode}'`);
        }
        await this.rolePermissions.grant(role.id, permissionId, tx);
      }
    }
  }
}
