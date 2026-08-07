import { Inject, Injectable, Logger } from "@nestjs/common";
import { asUuid, fail, ok, Result } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { UserSession } from "../../domain/entities/user-session.entity";
import { OFFICE_USER_REPOSITORY } from "../../domain/repositories/office-user.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import { OIDC_AUTHORIZATION_REQUEST_REPOSITORY } from "../../domain/repositories/oidc-authorization-request.repository";
import type { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import { USER_ACCOUNT_REPOSITORY } from "../../domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "../../domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../../domain/repositories/user-session.repository";
import { ENCRYPTION_PORT } from "../ports/encryption.port";
import type { EncryptionPort } from "../ports/encryption.port";
import { OIDC_CLIENT_PORT } from "../ports/oidc-client.port";
import type { OidcClientPort } from "../ports/oidc-client.port";
import { SESSION_TOKEN_PORT } from "../ports/session-token.port";
import type { SessionTokenPort } from "../ports/session-token.port";

export type CompleteLoginErrorCode =
  | "INVALID_STATE"
  | "REQUEST_EXPIRED_OR_USED"
  | "PROVIDER_EXCHANGE_FAILED"
  | "NO_ACTIVE_ACCOUNT"
  | "NO_OFFICE_MEMBERSHIP";

export interface CompleteLoginSuccess {
  readonly sessionToken: string;
  readonly csrfToken: string;
  readonly returnPath: string;
}

/**
 * 09-authentication-session-architecture.md, login steps 4-5. Every failure
 * branch records a security event without token content (per "Failure
 * behavior") and returns a stable code — never a raw exception — so the
 * controller can map it to a safe response without leaking why, beyond
 * what's useful for the legitimate client to retry correctly.
 */
@Injectable()
export class CompleteLoginUseCase {
  private readonly logger = new Logger(CompleteLoginUseCase.name);

  constructor(
    @Inject(OIDC_CLIENT_PORT) private readonly oidcClient: OidcClientPort,
    @Inject(OIDC_AUTHORIZATION_REQUEST_REPOSITORY)
    private readonly requests: OidcAuthorizationRequestRepository,
    @Inject(USER_ACCOUNT_REPOSITORY) private readonly userAccounts: UserAccountRepository,
    @Inject(OFFICE_USER_REPOSITORY) private readonly officeUsers: OfficeUserRepository,
    @Inject(USER_SESSION_REPOSITORY) private readonly sessions: UserSessionRepository,
    @Inject(SESSION_TOKEN_PORT) private readonly sessionTokens: SessionTokenPort,
    @Inject(ENCRYPTION_PORT) private readonly envelopeEncryption: EncryptionPort,
  ) {}

  async execute(params: {
    readonly callbackUrl: URL;
  }): Promise<Result<CompleteLoginSuccess, CompleteLoginErrorCode>> {
    const now = new Date();
    const presentedState = params.callbackUrl.searchParams.get("state");
    if (!presentedState) {
      return fail("INVALID_STATE");
    }

    const request = await this.requests.findByStateHash(this.sessionTokens.hash(presentedState));
    if (!request) {
      this.logger.warn("OIDC callback presented a state with no matching authorization request");
      return fail("INVALID_STATE");
    }
    if (!request.isUsable(now)) {
      this.logger.warn(`OIDC authorization request ${request.id} is expired or already used`);
      return fail("REQUEST_EXPIRED_OR_USED");
    }

    const nonce = this.envelopeEncryption.decrypt(request.nonceEncrypted);
    const pkceCodeVerifier = this.envelopeEncryption.decrypt(request.pkceVerifierEncrypted);

    let identity;
    try {
      // issuer/audience/signature/state/nonce/PKCE are all validated inside
      // this call (09-authentication-session-architecture.md, step 4).
      identity = await this.oidcClient.exchangeAuthorizationCode({
        callbackUrl: params.callbackUrl,
        expectedState: presentedState,
        expectedNonce: nonce,
        pkceCodeVerifier,
      });
    } catch (error) {
      // Not marked used: the code itself is single-use at the provider
      // regardless, and a transient provider-side failure shouldn't burn
      // the user's one local retry window.
      this.logger.warn(
        `OIDC code exchange failed for authorization request ${request.id}`,
        error instanceof Error ? error.message : error,
      );
      return fail("PROVIDER_EXCHANGE_FAILED");
    }

    const account = await this.userAccounts.findByExternalIdentity(identity.issuer, identity.subject);
    if (!account || !account.isActive()) {
      // Deliberately no auto-provisioning: login maps to an ACTIVE
      // user_account, it never creates one (09-authentication-session-
      // architecture.md, "Recovery and administration" — accounts are
      // admin-provisioned).
      this.logger.warn(`OIDC identity ${identity.issuer}/${identity.subject} has no active user_account`);
      return fail("NO_ACTIVE_ACCOUNT");
    }

    const officeUser = await this.officeUsers.findByUserId(account.id);
    if (!officeUser || !officeUser.isActive) {
      this.logger.warn(`user_account ${account.id} has no active office membership`);
      return fail("NO_OFFICE_MEMBERSHIP");
    }

    const sessionToken = this.sessionTokens.generateOpaqueToken();
    const csrfToken = this.sessionTokens.generateOpaqueToken();
    const session = UserSession.create({
      id: asUuid(randomUUID()),
      sessionHash: this.sessionTokens.hash(sessionToken),
      userId: account.id,
      officeId: officeUser.officeId,
      authenticatedAt: identity.authTime ?? now,
      mfaContext: this.deriveMfaContext(identity.authMethods),
      csrfTokenHash: this.sessionTokens.hash(csrfToken),
      permissionVersion: officeUser.permissionVersion,
      now,
    });
    await this.sessions.create(session);

    request.markUsed(now);
    await this.requests.markUsed(request);

    return ok({ sessionToken, csrfToken, returnPath: request.returnPath });
  }

  /** Passes through what the provider actually asserted — never fabricated. */
  private deriveMfaContext(authMethods: readonly string[] | null): string | null {
    if (!authMethods) {
      return null;
    }
    const otpMethod = authMethods.find((method) => method === "otp" || method === "mfa");
    return otpMethod ?? authMethods[0] ?? null;
  }
}
