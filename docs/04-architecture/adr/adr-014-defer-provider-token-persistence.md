# ADR-014: Defer OIDC Provider-Token Persistence

- **Status:** Proposed — accept when Release 1 session work starts
- **Amends:** ADR-013 (narrows one consequence; the BFF/PKCE/opaque-cookie pattern is unchanged)
- **Constraint:** v1 has no proven requirement yet for provider-initiated logout propagation or any other capability that needs the provider's own access/refresh tokens after login completes.

## Context

ADR-013 accepted a backend-for-frontend session: NestJS completes OIDC Authorization Code with PKCE and issues an opaque first-party session cookie, with Angular holding no OIDC token. Its original consequences additionally called for retaining provider tokens server-side. Building that retention path (envelope-encrypted `provider_token_record` storage, key rotation, revocation-on-logout wiring) is real work with no consumer yet — Release 1 has no feature that reads a stored provider token after login.

## Decision

Release 1 does not persist provider access/refresh tokens. Login validates the OIDC callback, establishes the Dentix session (per `../09-authentication-session-architecture.md`), and discards the provider's tokens once validation completes. `provider_token_record` is not created in v1.

Provider-token persistence is added later only on a proven trigger, for example:
- Provider-initiated (back-channel) logout needs to be propagated to the Dentix session.
- A future integration needs to call the provider's API on the user's behalf.

Adding it later is additive: the session architecture and ADR-013's cookie/session pattern do not change, only whether a provider-token record is written.

## Consequences

- Simpler Release 1 session implementation; no token-encryption-at-rest machinery to build before there's a consumer.
- Provider-initiated logout is not propagated in v1 — session revocation relies on Dentix-side logout, expiry, and admin-initiated revocation only. This is an accepted gap until the trigger above is hit.
- `04-data-model.md`'s `provider_token_record` row remains the documented target shape for when this ADR's trigger is hit; it is not built until then.

## Acceptance checklist

- [ ] Release 1 login/logout flow implemented with no `provider_token_record` writes.
- [ ] Session revocation tests cover Dentix-side logout, expiry, and admin revocation — not provider-initiated logout.
- [ ] A follow-up note exists wherever provider-initiated logout is later required, pointing back to this ADR for the trigger condition.
