# ADR-013: OIDC-Backed Backend-for-Frontend Session

- **Status:** Accepted
- **Date:** 2026-08-05

## Context

Dentix is an Angular browser application handling clinical and financial data. Storing OAuth access or refresh tokens in browser storage increases token-exfiltration risk and leaves CSRF/session behavior ambiguous.

## Decision

NestJS acts as a backend for frontend for authentication. It completes OIDC Authorization Code with PKCE, retains provider tokens server-side, and issues an opaque secure first-party session cookie. Angular stores no OIDC token. Dentix owns role, permission, office, object, and recent-authentication authorization.

The detailed flow, cookie/session state, CSRF, revocation, recovery, failure behavior, and verification requirements are defined in `../09-authentication-session-architecture.md`.

## Consequences

- Browser token theft exposure is reduced.
- Unsafe requests require session-bound CSRF protection.
- The API and Angular application are same-origin by default.
- PostgreSQL stores authoritative session/revocation state; Redis is an optional cache.
- The NestJS API owns additional session and provider-token protection responsibilities.
- ADR-007 selects the OIDC provider but may not replace this session pattern without a replacement ADR.
