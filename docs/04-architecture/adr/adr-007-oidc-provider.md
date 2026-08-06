# ADR-007: OIDC Identity Provider

- **Status:** Proposed — must be accepted during Release 0.5
- **Open decision:** select the self-hostable OIDC provider. The browser/API session pattern is already accepted in `../09-authentication-session-architecture.md`.

## Options to evaluate
1. **Keycloak (self-hosted)** — full OIDC + MFA (TOTP), admin UI, Persian localization possible; operational burden on a small team.
2. **Ory Kratos/Hydra (self-hosted)** — lighter pieces, more assembly.
3. **Custom NestJS auth** — rejected by default: re-implementing OIDC/MFA is a security risk and contradicts the baseline.

## Decision drivers
Self-hostable in-country, MFA support, provider logout/revocation, recovery flows, required authentication context, audit events, backup/restore, and upgrade cadence a small team can sustain.

## Recommended decision

**Keycloak, self-hosted in the ADR-010 Compose stack**, configured as:

- One realm, exported to the repository (secrets excluded) so provider config is reviewable and restorable.
- MFA: TOTP required for every account with patient access; recovery codes generated at enrollment.
- `max_age`/`prompt=login` support verified for the recent-authentication flow in `../09-authentication-session-architecture.md`.
- Signing-key rotation on a recorded schedule; keys backed up with the ADR-010 backup pipeline.
- Admin console reachable only from an allow-listed network path; admin actions are part of the audit story.

Ory Kratos/Hydra stays the fallback if Keycloak's resource footprint proves too heavy on the chosen host. Custom NestJS auth remains rejected.

## Acceptance checklist (Release 0.5 proofs)

- [ ] Login → MFA → BFF callback → `__Host-dentix_session` cookie works against the deployed provider.
- [ ] `prompt=login` re-authentication satisfies the recent-authentication window check.
- [ ] Provider logout/revocation invalidates the session per the session architecture tests.
- [ ] Realm export/import restore rehearsed once.
