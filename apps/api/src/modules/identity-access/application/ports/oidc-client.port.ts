/**
 * Port over the OIDC provider interaction. The adapter (infrastructure/oidc)
 * is the only place `openid-client` is imported — application/ knows OIDC
 * concepts (authorization URL, code exchange) but not the library's API
 * (03-module-boundaries.md: application defines ports, never depends on a
 * concrete library directly).
 */
export interface AuthorizationRequestParams {
  readonly state: string;
  readonly nonce: string;
  readonly pkceCodeVerifier: string;
  readonly pkceCodeChallenge: string;
  /**
   * `prompt=login` forces the provider to re-authenticate interactively even
   * when it still holds a valid SSO session, which is what makes the
   * returned `auth_time` — and therefore the recent-authentication window in
   * 09-authentication-session-architecture.md — actually move forward.
   * Omitted for ordinary logins so an existing SSO session is still reused.
   */
  readonly forceReauthentication?: boolean;
}

export interface ExchangedIdentity {
  readonly subject: string;
  readonly issuer: string;
  /** ID token's auth_time claim, if the provider returned one. */
  readonly authTime: Date | null;
  /**
   * ID token's `amr` (Authentication Methods References) claim — e.g.
   * `["otp", "pwd"]`. Used to record what the session's mfaContext
   * actually was rather than assuming; null if the provider didn't send it.
   */
  readonly authMethods: readonly string[] | null;
}

export interface OidcClientPort {
  buildAuthorizationUrl(params: AuthorizationRequestParams): URL;

  /**
   * Exchanges the authorization code on `callbackUrl` for tokens, validating
   * state/nonce/PKCE/issuer/audience/signature as part of the exchange
   * (09-authentication-session-architecture.md, login step 4). Provider
   * tokens are never returned here — ADR-014: only the identity claims a
   * caller needs to map to a user_account survive past this call.
   */
  exchangeAuthorizationCode(params: {
    readonly callbackUrl: URL;
    readonly expectedState: string;
    readonly expectedNonce: string;
    readonly pkceCodeVerifier: string;
  }): Promise<ExchangedIdentity>;

  buildEndSessionUrl(params: { readonly postLogoutRedirectUri: string }): URL;
}

export const OIDC_CLIENT_PORT = Symbol("OIDC_CLIENT_PORT");
