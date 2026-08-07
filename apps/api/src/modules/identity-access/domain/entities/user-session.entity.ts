import { Uuid } from "@dentix/kernel";
import { SESSION_POLICY } from "../value-objects/session-policy";

export interface UserSessionProps {
  readonly id: Uuid;
  readonly sessionHash: string;
  readonly userId: Uuid;
  readonly officeId: Uuid;
  readonly authenticatedAt: Date;
  readonly mfaContext: string | null;
  readonly csrfTokenHash: string;
  readonly permissionVersion: number;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: string | null;
}

export type SessionValidity =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: "REVOKED" | "IDLE_EXPIRED" | "ABSOLUTE_EXPIRED" };

export class UserSession {
  private constructor(private props: UserSessionProps) {}

  static reconstitute(props: UserSessionProps): UserSession {
    return new UserSession(props);
  }

  static create(params: {
    readonly id: Uuid;
    readonly sessionHash: string;
    readonly userId: Uuid;
    readonly officeId: Uuid;
    readonly authenticatedAt: Date;
    readonly mfaContext: string | null;
    readonly csrfTokenHash: string;
    readonly permissionVersion: number;
    readonly now: Date;
  }): UserSession {
    return new UserSession({
      id: params.id,
      sessionHash: params.sessionHash,
      userId: params.userId,
      officeId: params.officeId,
      authenticatedAt: params.authenticatedAt,
      mfaContext: params.mfaContext,
      csrfTokenHash: params.csrfTokenHash,
      permissionVersion: params.permissionVersion,
      createdAt: params.now,
      lastSeenAt: params.now,
      idleExpiresAt: new Date(params.now.getTime() + SESSION_POLICY.idleTimeoutMs),
      absoluteExpiresAt: new Date(params.now.getTime() + SESSION_POLICY.absoluteLifetimeMs),
      revokedAt: null,
      revokedReason: null,
    });
  }

  get id(): Uuid {
    return this.props.id;
  }

  get sessionHash(): string {
    return this.props.sessionHash;
  }

  get userId(): Uuid {
    return this.props.userId;
  }

  get officeId(): Uuid {
    return this.props.officeId;
  }

  get csrfTokenHash(): string {
    return this.props.csrfTokenHash;
  }

  get permissionVersion(): number {
    return this.props.permissionVersion;
  }

  get authenticatedAt(): Date {
    return this.props.authenticatedAt;
  }

  get mfaContext(): string | null {
    return this.props.mfaContext;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get revokedReason(): string | null {
    return this.props.revokedReason;
  }

  get lastSeenAt(): Date {
    return this.props.lastSeenAt;
  }

  get idleExpiresAt(): Date {
    return this.props.idleExpiresAt;
  }

  get absoluteExpiresAt(): Date {
    return this.props.absoluteExpiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  checkValidity(now: Date): SessionValidity {
    if (this.props.revokedAt !== null) {
      return { valid: false, reason: "REVOKED" };
    }
    if (now.getTime() > this.props.absoluteExpiresAt.getTime()) {
      return { valid: false, reason: "ABSOLUTE_EXPIRED" };
    }
    if (now.getTime() > this.props.idleExpiresAt.getTime()) {
      return { valid: false, reason: "IDLE_EXPIRED" };
    }
    return { valid: true };
  }

  /** Recent-authentication window check (signing, export, refunds, ...). */
  isRecentlyAuthenticated(
    now: Date,
    windowMs: number = SESSION_POLICY.recentAuthenticationWindowMs,
  ): boolean {
    return now.getTime() - this.props.authenticatedAt.getTime() <= windowMs;
  }

  touch(now: Date): void {
    this.props = {
      ...this.props,
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + SESSION_POLICY.idleTimeoutMs),
    };
  }

  revoke(reason: string, now: Date): void {
    if (this.props.revokedAt !== null) {
      return;
    }
    this.props = { ...this.props, revokedAt: now, revokedReason: reason };
  }
}
