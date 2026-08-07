import { Inject, Injectable } from "@nestjs/common";
import { UserSession } from "../../domain/entities/user-session.entity";
import { USER_SESSION_REPOSITORY } from "../../domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { OIDC_CLIENT_PORT } from "../ports/oidc-client.port";
import type { OidcClientPort } from "../ports/oidc-client.port";

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
  ) {}

  async execute(params: {
    readonly session: UserSession;
    readonly postLogoutRedirectUri: string;
  }): Promise<{ readonly providerEndSessionUrl: URL }> {
    params.session.revoke("user-initiated logout", new Date());
    await this.sessions.update(params.session);

    const providerEndSessionUrl = this.oidcClient.buildEndSessionUrl({
      postLogoutRedirectUri: params.postLogoutRedirectUri,
    });
    return { providerEndSessionUrl };
  }
}
