import { Uuid } from "@dentix/kernel";
import { PermissionCode } from "../value-objects/permission-code";

export type PermissionExceptionEffect = "grant" | "deny";

export interface UserPermissionExceptionProps {
  readonly id: Uuid;
  readonly officeUserId: Uuid;
  readonly permissionCode: PermissionCode;
  readonly effect: PermissionExceptionEffect;
  readonly reason: string;
  readonly effectiveAt: Date;
  readonly expiresAt: Date | null;
  readonly revokedAt: Date | null;
}

/**
 * A per-user override on top of whatever a role grants — 01-product/
 * 04-roles-and-permissions.md: "A role grants a starting permission set;
 * individual exceptions must be visible and auditable." `effect` lets an
 * exception either add a permission the user's roles don't grant, or
 * withdraw one they otherwise would have — both are real cases (a trusted
 * assistant given one extra capability; a manager temporarily denied
 * refunds during an investigation), so this isn't only ever "grant".
 *
 * `reason` is required at the type level, not just convention — the
 * permission doc names it explicitly, and an exception with no stated
 * reason is exactly the kind of silent scope-creep a permission model
 * exists to prevent.
 */
export class UserPermissionException {
  private constructor(private readonly props: UserPermissionExceptionProps) {}

  static reconstitute(props: UserPermissionExceptionProps): UserPermissionException {
    return new UserPermissionException(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly officeUserId: Uuid;
    readonly permissionCode: PermissionCode;
    readonly effect: PermissionExceptionEffect;
    readonly reason: string;
    readonly now: Date;
    readonly expiresAt?: Date | null;
  }): UserPermissionException {
    const reason = params.reason.trim();
    if (reason.length === 0) {
      throw new Error("UserPermissionException requires a non-blank reason");
    }
    if (params.expiresAt && params.expiresAt.getTime() <= params.now.getTime()) {
      throw new Error("UserPermissionException expiresAt must be in the future");
    }
    return new UserPermissionException({
      id: params.id,
      officeUserId: params.officeUserId,
      permissionCode: params.permissionCode,
      effect: params.effect,
      reason,
      effectiveAt: params.now,
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get officeUserId(): Uuid {
    return this.props.officeUserId;
  }

  get permissionCode(): PermissionCode {
    return this.props.permissionCode;
  }

  get effect(): PermissionExceptionEffect {
    return this.props.effect;
  }

  get reason(): string {
    return this.props.reason;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  /** Not yet effective, expired, and manually revoked are three different reasons to ignore an exception — all resolve to "doesn't apply right now". */
  isActiveAt(now: Date): boolean {
    if (this.props.revokedAt && this.props.revokedAt.getTime() <= now.getTime()) {
      return false;
    }
    if (this.props.effectiveAt.getTime() > now.getTime()) {
      return false;
    }
    if (this.props.expiresAt && this.props.expiresAt.getTime() <= now.getTime()) {
      return false;
    }
    return true;
  }

  /** Ending an exception early — distinct from letting a planned expiresAt lapse; see the migration's own comment on why both columns exist. */
  revoke(now: Date): UserPermissionException {
    if (this.props.revokedAt) {
      return this;
    }
    return new UserPermissionException({ ...this.props, revokedAt: now });
  }
}
