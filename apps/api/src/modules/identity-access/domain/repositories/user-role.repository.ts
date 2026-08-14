import { TransactionContext, Uuid } from "@dentix/kernel";

export interface UserRoleRepository {
  grant(officeUserId: Uuid, roleId: Uuid, createdBy: Uuid | null, tx?: TransactionContext): Promise<void>;
  /** Revoking a role is a real delete — see the migration's own comment on why link tables aren't soft-deleted. */
  revoke(officeUserId: Uuid, roleId: Uuid, tx?: TransactionContext): Promise<void>;
  findRoleIdsByOfficeUserId(officeUserId: Uuid): Promise<readonly Uuid[]>;
}

export const USER_ROLE_REPOSITORY = Symbol("USER_ROLE_REPOSITORY");
