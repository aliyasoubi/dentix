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

/**
 * The recent-authentication comparison itself, as a pure function so the
 * two callers that need it share one definition: `UserSession`'s own
 * `isRecentlyAuthenticated()` (which has the entity in hand) and use cases
 * gating a sensitive action on a session's `authenticatedAt` passed to them
 * as a plain value. Duplicating the comparison is how the window silently
 * drifts between the check and what whoami reports.
 */
export function isWithinRecentAuthenticationWindow(
  authenticatedAt: Date,
  now: Date,
  windowMs: number = SESSION_POLICY.recentAuthenticationWindowMs,
): boolean {
  return now.getTime() - authenticatedAt.getTime() <= windowMs;
}

export const OIDC_AUTHORIZATION_REQUEST_TTL_MS = 10 * 60 * 1000;
