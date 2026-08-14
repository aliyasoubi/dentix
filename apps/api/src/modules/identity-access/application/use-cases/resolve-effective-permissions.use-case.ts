import { Inject, Injectable } from "@nestjs/common";
import { Uuid } from "@dentix/kernel";
import { AuthorizationPort } from "../ports/authorization.port";
import { OFFICE_USER_REPOSITORY } from "../../domain/repositories/office-user.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { PERMISSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import type { PermissionRepository } from "../../domain/repositories/permission.repository";
import { ROLE_PERMISSION_REPOSITORY } from "../../domain/repositories/role-permission.repository";
import type { RolePermissionRepository } from "../../domain/repositories/role-permission.repository";
import { USER_PERMISSION_EXCEPTION_REPOSITORY } from "../../domain/repositories/user-permission-exception.repository";
import type { UserPermissionExceptionRepository } from "../../domain/repositories/user-permission-exception.repository";
import { USER_ROLE_REPOSITORY } from "../../domain/repositories/user-role.repository";
import type { UserRoleRepository } from "../../domain/repositories/user-role.repository";
import { PermissionCode } from "../../domain/value-objects/permission-code";

/**
 * 01-product/04-roles-and-permissions.md: "A role grants a starting
 * permission set; individual exceptions must be visible and auditable."
 * The resolution order this encodes: union every role's grants, layer
 * explicit `grant` exceptions on top (an exception can hand someone a
 * permission no role of theirs provides), then remove anything an
 * explicit `deny` exception withdraws — deny always wins, including over
 * an exception's own grant, so a caller can never construct a
 * contradictory pair that accidentally resolves to "allowed." Only
 * exceptions active right now (`isActiveAt(now)`) are considered — not yet
 * effective, expired, or revoked ones are exactly as if they didn't exist.
 *
 * Deliberately a fresh computation on every call, not a cache keyed by
 * `office_user.permission_version` — every other authorization decision in
 * this codebase already does fresh repository lookups per request
 * (CLAUDE.md invariant 7), and this module's permission tables are small
 * enough that "always fresh" is the honest, simplest thing that works at
 * this project's actual scale. `permission_version` still exists and still
 * increments on a permission-affecting change (09-authentication-session-
 * architecture.md) — it is the signal a future cache would invalidate
 * against, not something this use case needs today to be correct.
 */
@Injectable()
export class ResolveEffectivePermissionsUseCase implements AuthorizationPort {
  constructor(
    @Inject(OFFICE_USER_REPOSITORY) private readonly officeUsers: OfficeUserRepository,
    @Inject(USER_ROLE_REPOSITORY) private readonly userRoles: UserRoleRepository,
    @Inject(ROLE_PERMISSION_REPOSITORY) private readonly rolePermissions: RolePermissionRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(USER_PERMISSION_EXCEPTION_REPOSITORY)
    private readonly exceptions: UserPermissionExceptionRepository,
  ) {}

  async execute(params: {
    readonly userId: Uuid;
    readonly officeId: Uuid;
  }): Promise<ReadonlySet<PermissionCode>> {
    const officeUser = await this.officeUsers.findByUserId(params.userId);
    if (!officeUser || !officeUser.isActive || officeUser.officeId !== params.officeId) {
      // No active membership in this office at all — same fail-closed
      // stance as ResolveActiveSessionUseCase, and the reason this checks
      // officeId even though today's single-office deployment makes a
      // mismatch unreachable in practice: the check is what keeps it that
      // way rather than merely happening to be true.
      return new Set();
    }

    const roleIds = await this.userRoles.findRoleIdsByOfficeUserId(officeUser.id);
    const grantedPermissionIds = await this.rolePermissions.findPermissionIdsByRoleIds(roleIds);
    const grantedIdSet = new Set(grantedPermissionIds);

    const allPermissions = await this.permissions.findAll();
    const effective = new Set<PermissionCode>(
      allPermissions.filter((p) => grantedIdSet.has(p.id)).map((p) => p.code),
    );

    const now = new Date();
    const activeExceptions = (await this.exceptions.findByOfficeUserId(officeUser.id)).filter((exception) =>
      exception.isActiveAt(now),
    );
    for (const exception of activeExceptions) {
      if (exception.effect === "grant") {
        effective.add(exception.permissionCode);
      }
    }
    // Deny is a second pass, not folded into the loop above, so that
    // ordering within `activeExceptions` can never matter — a deny always
    // wins regardless of whether the matching grant exception (or role
    // grant) was processed before or after it.
    for (const exception of activeExceptions) {
      if (exception.effect === "deny") {
        effective.delete(exception.permissionCode);
      }
    }

    return effective;
  }

  async hasPermission(userId: Uuid, officeId: Uuid, code: PermissionCode): Promise<boolean> {
    const effective = await this.execute({ userId, officeId });
    return effective.has(code);
  }
}
