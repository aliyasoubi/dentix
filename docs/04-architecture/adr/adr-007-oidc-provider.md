# ADR-007: OIDC Identity Provider

- **Status:** Proposed — must be accepted during Release 0.5
- **Gap identified in design review:** OIDC + MFA is required, but no provider is chosen. Foreign SaaS IdPs (Auth0, Okta, Entra) are unreliable or unavailable for domestic Iranian operation.

## Options to evaluate
1. **Keycloak (self-hosted)** — full OIDC + MFA (TOTP), admin UI, Persian localization possible; operational burden on a small team.
2. **Ory Kratos/Hydra (self-hosted)** — lighter pieces, more assembly.
3. **Custom NestJS auth** — rejected by default: re-implementing OIDC/MFA is a security risk and contradicts the baseline.

## Decision drivers
Self-hostable in-country, MFA support, session revocation, recovery flows, audit events, upgrade cadence a small team can sustain.

## Decision
_To be recorded, including MFA method, token lifetimes, and recent-authentication mechanism for signing/finance actions._
