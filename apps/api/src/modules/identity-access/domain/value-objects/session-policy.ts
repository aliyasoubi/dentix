/**
 * 09-authentication-session-architecture.md, "Server-side session state":
 * "Initial policy values are office-configurable within security-approved
 * bounds." Office-configurability is a later slice (Layer 2 config,
 * 06-configuration-catalog.md) — S3 hardcodes the stated initial values
 * so the walking skeleton proves the mechanism, not the config plumbing.
 */
export const SESSION_POLICY = {
  idleTimeoutMs: 30 * 60 * 1000,
  absoluteLifetimeMs: 12 * 60 * 60 * 1000,
  recentAuthenticationWindowMs: 5 * 60 * 1000,
} as const;

export const OIDC_AUTHORIZATION_REQUEST_TTL_MS = 10 * 60 * 1000;
