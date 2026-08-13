import { Inject, Injectable } from "@nestjs/common";
import { asUuid, fail, ok, Result } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { OidcAuthorizationRequest } from "../../domain/entities/oidc-authorization-request.entity";
import { OIDC_AUTHORIZATION_REQUEST_REPOSITORY } from "../../domain/repositories/oidc-authorization-request.repository";
import type { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import { ENCRYPTION_PORT } from "../ports/encryption.port";
import type { EncryptionPort } from "../ports/encryption.port";
import { OIDC_CLIENT_PORT } from "../ports/oidc-client.port";
import type { OidcClientPort } from "../ports/oidc-client.port";
import { SESSION_TOKEN_PORT } from "../ports/session-token.port";
import type { SessionTokenPort } from "../ports/session-token.port";

export type StartLoginErrorCode = "INVALID_RETURN_PATH";

/**
 * 09-authentication-session-architecture.md, login step 2: "NestJS creates
 * state, nonce, and PKCE verifier and redirects to the configured OIDC
 * provider." The returnPath validation that guards against open redirects
 * lives in OidcAuthorizationRequest.create, which throws synchronously on
 * a bad path — caught here and turned into a Result so a malformed
 * client-supplied `returnTo` query param is the 400 it actually is, not
 * an uncaught exception that NestJS's default filter reports as a 500.
 */
@Injectable()
export class StartLoginUseCase {
  constructor(
    @Inject(OIDC_CLIENT_PORT) private readonly oidcClient: OidcClientPort,
    @Inject(OIDC_AUTHORIZATION_REQUEST_REPOSITORY)
    private readonly requests: OidcAuthorizationRequestRepository,
    @Inject(SESSION_TOKEN_PORT) private readonly sessionTokens: SessionTokenPort,
    @Inject(ENCRYPTION_PORT) private readonly envelopeEncryption: EncryptionPort,
  ) {}

  async execute(params: {
    readonly returnPath: string;
    /**
     * Set when the caller is recovering from RECENT_AUTHENTICATION_REQUIRED
     * — forces `prompt=login` so the provider re-authenticates the user
     * interactively and issues a fresh `auth_time`, which is the only thing
     * that actually advances the recent-authentication window.
     */
    readonly forceReauthentication?: boolean;
  }): Promise<Result<{ readonly authorizationUrl: URL }, StartLoginErrorCode>> {
    const now = new Date();
    const state = this.sessionTokens.generateOpaqueToken();
    const nonce = this.sessionTokens.generateOpaqueToken();
    const { verifier: pkceCodeVerifier, challenge: pkceCodeChallenge } =
      this.sessionTokens.generatePkcePair();

    let request: OidcAuthorizationRequest;
    try {
      request = OidcAuthorizationRequest.create({
        id: asUuid(randomUUID()),
        stateHash: this.sessionTokens.hash(state),
        nonceEncrypted: this.envelopeEncryption.encrypt(nonce),
        pkceVerifierEncrypted: this.envelopeEncryption.encrypt(pkceCodeVerifier),
        returnPath: params.returnPath,
        now,
      });
    } catch {
      return fail("INVALID_RETURN_PATH");
    }
    await this.requests.create(request);

    const authorizationUrl = this.oidcClient.buildAuthorizationUrl({
      state,
      nonce,
      pkceCodeVerifier,
      pkceCodeChallenge,
      ...(params.forceReauthentication ? { forceReauthentication: true } : {}),
    });

    return ok({ authorizationUrl });
  }
}
