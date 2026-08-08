import { Inject, Injectable, Logger } from "@nestjs/common";
import { asUuid, fail, ok, Result, Uuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent } from "../../domain/entities/audit-event.entity";
import { UserSession } from "../../domain/entities/user-session.entity";
import { AUDIT_EVENT_REPOSITORY } from "../../domain/repositories/audit-event.repository";
import type { AuditEventRepository } from "../../domain/repositories/audit-event.repository";
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
import { UNIT_OF_WORK_PORT } from "../ports/unit-of-work.port";
import type { UnitOfWorkPort } from "../ports/unit-of-work.port";

export type CompleteLoginErrorCode =
  | "INVALID_STATE"
  | "REQUEST_EXPIRED_OR_USED"
  | "PROVIDER_EXCHANGE_FAILED"
  | "NO_ACTIVE_ACCOUNT"
  | "NO_OFFICE_MEMBERSHIP"
  | "AUTHENTICATION_TIME_UNVERIFIED";

/**
 * `amr` values Dentix would treat as proof MFA happened, if the provider
 * reliably sent them. It doesn't: verified against a real Keycloak 26.7
 * realm with TOTP enrolled and the OTP form actually completed, the
 * built-in oidc-amr-mapper still returns `amr: []` — Keycloak's classic
 * username/password + OTP-form authenticators don't populate the session
 * notes that mapper reads (WebAuthn credentials reportedly do). So this
 * cannot be a login-blocking gate today without breaking every real
 * login; mfaContext stays best-effort/informational (deriveMfaContext
 * below), and MFA is actually enforced the way it's provable right now:
 * realm-side, via CONFIGURE_TOTP as a default required action — verified
 * empirically that an account with zero 2FA credentials cannot get past
 * password auth. See ADR-007 and docs/open-decisions.md for the tracked
 * gap: revisit once there's a reliable per-login MFA signal (custom
 * protocol mapper, or acr-based step-up) to enforce here too.
 */
const ACCEPTED_MFA_METHODS: ReadonlySet<string> = new Set(["otp", "mfa"]);

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
    @Inject(AUDIT_EVENT_REPOSITORY) private readonly auditEvents: AuditEventRepository,
    @Inject(UNIT_OF_WORK_PORT) private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(params: {
    readonly callbackUrl: URL;
  }): Promise<Result<CompleteLoginSuccess, CompleteLoginErrorCode>> {
    const now = new Date();
    const presentedState = params.callbackUrl.searchParams.get("state");
    if (!presentedState) {
      return this.rejectLogin("INVALID_STATE", { now });
    }

    const request = await this.requests.findByStateHash(this.sessionTokens.hash(presentedState));
    if (!request) {
      this.logger.warn("OIDC callback presented a state with no matching authorization request");
      return this.rejectLogin("INVALID_STATE", { now });
    }
    if (!request.isUsable(now)) {
      this.logger.warn(`OIDC authorization request ${request.id} is expired or already used`);
      return this.rejectLogin("REQUEST_EXPIRED_OR_USED", { now });
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
      return this.rejectLogin("PROVIDER_EXCHANGE_FAILED", { now });
    }

    if (!identity.authTime) {
      // No auth_time claim means we cannot tell whether this ID token
      // reflects a fresh interactive login or an old provider SSO session
      // being silently re-asserted — fabricating "now" here would defeat
      // the recent-authentication window entirely (09-authentication-
      // session-architecture.md). Fail closed rather than guess.
      this.logger.warn(
        `OIDC identity ${identity.issuer}/${identity.subject} exchange carried no auth_time claim`,
      );
      return this.rejectLogin("AUTHENTICATION_TIME_UNVERIFIED", { now });
    }

    const mfaContext = this.deriveMfaContext(identity.authMethods);

    const account = await this.userAccounts.findByExternalIdentity(identity.issuer, identity.subject);
    if (!account || !account.isActive()) {
      // Deliberately no auto-provisioning: login maps to an ACTIVE
      // user_account, it never creates one (09-authentication-session-
      // architecture.md, "Recovery and administration" — accounts are
      // admin-provisioned).
      this.logger.warn(`OIDC identity ${identity.issuer}/${identity.subject} has no active user_account`);
      return this.rejectLogin("NO_ACTIVE_ACCOUNT", { now, actorUserId: account?.id ?? null });
    }

    const officeUser = await this.officeUsers.findByUserId(account.id);
    if (!officeUser || !officeUser.isActive) {
      this.logger.warn(`user_account ${account.id} has no active office membership`);
      return this.rejectLogin("NO_OFFICE_MEMBERSHIP", { now, actorUserId: account.id });
    }

    const sessionToken = this.sessionTokens.generateOpaqueToken();
    const csrfToken = this.sessionTokens.generateOpaqueToken();
    const session = UserSession.create({
      id: asUuid(randomUUID()),
      sessionHash: this.sessionTokens.hash(sessionToken),
      userId: account.id,
      officeId: officeUser.officeId,
      authenticatedAt: identity.authTime,
      mfaContext,
      csrfTokenHash: this.sessionTokens.hash(csrfToken),
      permissionVersion: officeUser.permissionVersion,
      now,
    });

    // Session creation, request consumption, and the audit record all land
    // in one transaction (03-module-boundaries.md) — no window where a
    // session exists but its authorization request wasn't consumed, or
    // vice versa.
    await this.unitOfWork.runInTransaction(async (tx) => {
      await this.sessions.create(session, tx);
      request.markUsed(now);
      await this.requests.markUsed(request, tx);
      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: officeUser.officeId,
          actorUserId: account.id,
          action: "login_succeeded",
          entityType: "user_session",
          entityId: session.id,
          detail: null,
          now,
        }),
        tx,
      );
    });

    return ok({ sessionToken, csrfToken, returnPath: request.returnPath });
  }

  private async rejectLogin(
    code: CompleteLoginErrorCode,
    context: { readonly now: Date; readonly actorUserId?: Uuid | null },
  ): Promise<Result<CompleteLoginSuccess, CompleteLoginErrorCode>> {
    await this.auditEvents.create(
      AuditEvent.create({
        id: asUuid(randomUUID()),
        officeId: null,
        actorUserId: context.actorUserId ?? null,
        action: "login_failed",
        entityType: "login_attempt",
        entityId: null,
        detail: `reason=${code}`,
        now: context.now,
      }),
    );
    return fail(code);
  }

  /**
   * Null means "no accepted MFA method present" — the caller treats that
   * as a rejected login, not as "record unknown and let it through".
   * Deliberately does not fall back to authMethods[0]: an amr of ["pwd"]
   * must not silently pass as if it were MFA.
   */
  private deriveMfaContext(authMethods: readonly string[] | null): string | null {
    if (!authMethods) {
      return null;
    }
    return authMethods.find((method) => ACCEPTED_MFA_METHODS.has(method)) ?? null;
  }
}
