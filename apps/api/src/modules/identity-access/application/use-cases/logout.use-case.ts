import { Inject, Injectable } from "@nestjs/common";
import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent, AUDIT_EVENT_REPOSITORY } from "../../../audit/public-api";
import type { AuditEventRepository } from "../../../audit/public-api";
import { UserSession } from "../../domain/entities/user-session.entity";
import { USER_SESSION_REPOSITORY } from "../../domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { OIDC_CLIENT_PORT } from "../ports/oidc-client.port";
import type { OidcClientPort } from "../ports/oidc-client.port";
import { UNIT_OF_WORK_PORT } from "../../../../platform/unit-of-work.port";
import type { UnitOfWorkPort } from "../../../../platform/unit-of-work.port";

/**
 * 09-authentication-session-architecture.md, "Logout and revocation":
 * "Logout revokes the local session, clears the cookie, and attempts
 * provider logout/revocation when supported." Takes the already-resolved
 * session (SessionGuard did that work reaching this handler) rather than
 * re-deriving it from the raw token a second time. The provider
 * end-session URL is always returned so the controller can redirect there
 * next — RP-initiated logout needs a top-level browser navigation, not a
 * fetch/XHR call.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(USER_SESSION_REPOSITORY) private readonly sessions: UserSessionRepository,
    @Inject(OIDC_CLIENT_PORT) private readonly oidcClient: OidcClientPort,
    @Inject(AUDIT_EVENT_REPOSITORY) private readonly auditEvents: AuditEventRepository,
    @Inject(UNIT_OF_WORK_PORT) private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(params: {
    readonly session: UserSession;
    readonly postLogoutRedirectUri: string;
  }): Promise<{ readonly providerEndSessionUrl: URL }> {
    const now = new Date();
    params.session.revoke("user-initiated logout", now);

    await this.unitOfWork.runInTransaction(async (tx) => {
      await this.sessions.revoke(params.session, tx);
      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: params.session.officeId,
          actorUserId: params.session.userId,
          action: "logout",
          entityType: "user_session",
          entityId: params.session.id,
          detail: null,
          now,
        }),
        tx,
      );
    });

    const providerEndSessionUrl = this.oidcClient.buildEndSessionUrl({
      postLogoutRedirectUri: params.postLogoutRedirectUri,
    });
    return { providerEndSessionUrl };
  }
}
