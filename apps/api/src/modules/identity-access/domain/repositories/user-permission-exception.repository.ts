import { TransactionContext, Uuid } from "@dentix/kernel";
import { UserPermissionException } from "../entities/user-permission-exception.entity";

export interface UserPermissionExceptionRepository {
  create(
    exception: UserPermissionException,
    permissionId: Uuid,
    createdBy: Uuid | null,
    tx?: TransactionContext,
  ): Promise<void>;
  /** Everything currently on file for this membership — callers filter to `isActiveAt(now)` themselves, same as elsewhere in this codebase (validity is a domain question, not a query concern). */
  findByOfficeUserId(officeUserId: Uuid): Promise<readonly UserPermissionException[]>;
}

export const USER_PERMISSION_EXCEPTION_REPOSITORY = Symbol("USER_PERMISSION_EXCEPTION_REPOSITORY");
