import { TransactionContext, Uuid } from "@dentix/kernel";

export interface RolePermissionRepository {
  grant(roleId: Uuid, permissionId: Uuid, tx?: TransactionContext): Promise<void>;
  findPermissionIdsByRoleIds(roleIds: readonly Uuid[]): Promise<readonly Uuid[]>;
}

export const ROLE_PERMISSION_REPOSITORY = Symbol("ROLE_PERMISSION_REPOSITORY");
