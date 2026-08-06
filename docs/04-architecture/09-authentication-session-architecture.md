# Authentication and Session Architecture

- **Status:** Accepted by ADR-013.
- **Provider:** Selected separately by ADR-007.

## Decision

Use an OIDC-backed backend-for-frontend session. Angular never stores OIDC access or refresh tokens. NestJS completes the Authorization Code flow with PKCE, keeps provider tokens server-side, and issues an opaque first-party session cookie.

## Login flow

1. Angular navigates to `GET /auth/login` with an allowed return path.
2. NestJS creates state, nonce, and PKCE verifier and redirects to the configured OIDC provider.
3. The identity provider authenticates the user and enforces the required MFA policy.
4. NestJS validates issuer, audience, state, nonce, PKCE, token signature, and required authentication context.
5. NestJS maps the external subject to an active `user_account`, loads office membership and permission version, creates a server-side session, rotates the session identifier, and writes the cookie.
6. The callback redirects only to a validated same-origin path.

## Session cookie

The cookie is named `__Host-dentix_session` and is:

- `Secure`
- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- host-only, with no `Domain` attribute

The cookie contains only a random opaque identifier with at least 128 bits of entropy. Session identifiers are hashed before persistence.

## Server-side session state

PostgreSQL is the source of truth for session identity, revocation, and auditability. Redis may cache session lookups but must not be the only copy.

Each session records user, office, provider identity where applicable, authentication time, MFA/authentication context, created/last-seen/absolute-expiry times, permission version, revocation state, and a reference to an encrypted server-side provider-token record. Provider tokens are never returned to Angular or logged.

Initial policy values are office-configurable within security-approved bounds:

- Idle timeout: 30 minutes.
- Absolute session lifetime: 12 hours.
- Recent-authentication window: 5 minutes.
- Concurrent sessions: visible and revocable by the user and authorized administrator.

## API and CSRF

- Browser API calls use the same origin; CORS is disabled by default.
- Every unsafe request (`POST`, `PUT`, `PATCH`, `DELETE`) requires a CSRF token bound to the session and sent in a custom header.
- Origin and `Sec-Fetch-Site` checks provide defense in depth.
- Authentication endpoints, search, export, and recovery operations are rate-limited.
- State-changing requests never use `GET`.

## Authorization

OIDC proves identity; Dentix owns authorization. Roles and permissions are loaded from Dentix data, not trusted solely from token claims.

Every request performs:

1. Active-session validation.
2. Office-membership validation.
3. Endpoint permission check.
4. Object-level authorization inside the application use case.
5. State-transition authorization where applicable.

Permission changes increment the user's permission version. A mismatch invalidates cached authorization immediately and may revoke active sessions for high-risk changes.

## Recent authentication

Clinical signing, patient export, permission administration, refund, reversal, and configured high-risk finance actions require `authenticatedAt` within the recent-authentication window. If stale, the server returns `RECENT_AUTHENTICATION_REQUIRED` and starts a fresh OIDC authentication flow with `prompt=login` or the provider-equivalent maximum-age control. A session refresh alone does not count as recent authentication.

## Logout and revocation

Logout revokes the local session, clears the cookie, and attempts provider logout/revocation when supported. Disabled users, removed office memberships, detected compromise, password/MFA reset, and administrator revocation invalidate affected sessions promptly.

## Recovery and administration

Account recovery occurs at the identity provider. Dentix administrators may link or disable an external identity but never set or view passwords, MFA secrets, access tokens, or refresh tokens. Recovery, identity linking, session revocation, and administrative reset actions are audited.

## Failure behavior

- If the identity provider is unavailable, new login and reauthentication fail closed. Existing valid local sessions may continue until policy expiry unless the approved provider policy requires live introspection.
- If Redis is unavailable, session validation falls back to PostgreSQL.
- If PostgreSQL is unavailable, protected requests fail closed.
- Clock skew, issuer/audience mismatch, nonce/state failure, or missing MFA context rejects login and records a security event without token content.

## Verification

Integration and security tests cover login CSRF/state/nonce/PKCE, cookie attributes, session fixation, token leakage, logout/revocation, permission-version invalidation, object authorization, recent authentication, idle/absolute expiry, and identity-provider outage behavior.
