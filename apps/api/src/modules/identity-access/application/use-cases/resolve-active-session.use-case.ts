import { Inject, Injectable } from "@nestjs/common";
import { asUuid, fail, ok, Result } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent } from "../../domain/entities/audit-event.entity";
import { UserSession } from "../../domain/entities/user-session.entity";
import { AUDIT_EVENT_REPOSITORY } from "../../domain/repositories/audit-event.repository";
import type { AuditEventRepository } from "../../domain/repositories/audit-event.repository";
import { OFFICE_USER_REPOSITORY } from "../../domain/repositories/office-user.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { USER_ACCOUNT_REPOSITORY } from "../../domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "../../domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { SESSION_TOKEN_PORT } from "../ports/session-token.port";
import type { SessionTokenPort } from "../ports/session-token.port";
import { UNIT_OF_WORK_PORT } from "../ports/unit-of-work.port";
import type { UnitOfWorkPort } from "../ports/unit-of-work.port";

export type ResolveSessionErrorCode =
  | "NO_SESSION"
  | "REVOKED"
  | "IDLE_EXPIRED"
  | "ABSOLUTE_EXPIRED"
  | "ACCOUNT_INACTIVE"
  | "NO_OFFICE_MEMBERSHIP";

/**
 * Shared by SessionGuard (every protected request) and GetSessionUseCase
 * (whoami's own response) so "resolve by cookie, validate, touch" exists
 * in exactly one place. Touching on every guarded request — not just
 * whoami — is deliberate: activity is what the idle-timeout policy is
 * supposed to measure.
 *
 * A session's account/office-membership is re-checked on every call, not
 * only at login: the session token itself only proves "this was a valid
 * login once" — it says nothing about whether an admin disabled the
 * account or removed the office membership since. Skipping this check
 * would mean deactivating a user has no effect on sessions already
 * issued until they naturally expire (up to SESSION_POLICY.absoluteLifetimeMs
 * later).
 */
@Injectable()
export class ResolveActiveSessionUseCase {
  constructor(
    @Inject(USER_SESSION_REPOSITORY) private readonly sessions: UserSessionRepository,
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly userAccounts: UserAccountRepository,
    @Inject(OFFICE_USER_REPOSITORY) private readonly officeUsers: OfficeUserRepository,
    @Inject(SESSION_TOKEN_PORT) private readonly sessionTokens: SessionTokenPort,
    @Inject(AUDIT_EVENT_REPOSITORY) private readonly auditEvents: AuditEventRepository,
    @Inject(UNIT_OF_WORK_PORT) private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
  }): Promise<Result<UserSession, ResolveSessionErrorCode>> {
    const session = await this.sessions.findByHash(this.sessionTokens.hash(params.sessionToken));
    if (!session) {
      return fail("NO_SESSION");
    }

    const now = new Date();
    const validity = session.checkValidity(now);
    if (!validity.valid) {
      return fail(validity.reason);
    }

    const account = await this.userAccounts.findById(session.userId);
    if (!account || !account.isActive()) {
      await this.forceRevoke(session, "account no longer active", "session_revoked_account_inactive", now);
      return fail("ACCOUNT_INACTIVE");
    }

    const officeUser = await this.officeUsers.findByUserId(session.userId);
    if (!officeUser || !officeUser.isActive || officeUser.officeId !== session.officeId) {
      await this.forceRevoke(
        session,
        "office membership no longer active",
        "session_revoked_membership_inactive",
        now,
      );
      return fail("NO_OFFICE_MEMBERSHIP");
    }

    session.touch(now);
    const stillActive = await this.sessions.touchIfActive(session);
    if (!stillActive) {
      // Revoked by a concurrent request (e.g. logout) between the validity
      // check above and this write — the touch correctly didn't apply.
      return fail("REVOKED");
    }

    return ok(session);
  }

  /** Session revocation and its audit record land in one transaction. */
  private async forceRevoke(
    session: UserSession,
    reason: string,
    action: "session_revoked_account_inactive" | "session_revoked_membership_inactive",
    now: Date,
  ): Promise<void> {
    session.revoke(reason, now);
    await this.unitOfWork.runInTransaction(async (tx) => {
      await this.sessions.revoke(session, tx);
      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: session.officeId,
          actorUserId: session.userId,
          action,
          entityType: "user_session",
          entityId: session.id,
          detail: null,
          now,
        }),
        tx,
      );
    });
  }
}
