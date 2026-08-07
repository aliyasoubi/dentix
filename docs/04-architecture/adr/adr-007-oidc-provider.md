# ADR-007: OIDC Identity Provider

- **Status:** Proposed — accept via the acceptance checklist below
- **Constraint:** select the self-hostable OIDC provider; must be self-hostable in-country with MFA, logout/revocation, and backup/restore a small team can sustain. The browser/API session pattern is already accepted in `../09-authentication-session-architecture.md`.

## Recommended decision

**Keycloak, self-hosted in the ADR-010 Compose stack**, configured as:

- One realm, exported to the repository (secrets excluded) so provider config is reviewable and restorable.
- MFA: TOTP required for every account with patient access; recovery codes generated at enrollment.
- `max_age`/`prompt=login` support verified for the recent-authentication flow in `../09-authentication-session-architecture.md`.
- Signing-key rotation on a recorded schedule; keys backed up with the ADR-010 backup pipeline.
- Admin console reachable only from an allow-listed network path; admin actions are part of the audit story.

Ory Kratos/Hydra stays the fallback if Keycloak's resource footprint proves too heavy on the chosen host. Custom NestJS auth remains rejected.

## Acceptance checklist (Release 0.5 proofs)

- [x] Login → MFA → BFF callback → `__Host-dentix_session` cookie works against the deployed provider. *(S3: proven in a real browser against the running Keycloak container — password, forced TOTP enrollment, landed back authenticated, `whoami` returned the correct identity.)*
- [ ] `prompt=login` re-authentication satisfies the recent-authentication window check. *(Not built in S3 — `UserSession.isRecentlyAuthenticated()` exists and is exposed via whoami, but the `RECENT_AUTHENTICATION_REQUIRED` → fresh `prompt=login` flow itself belongs to whichever slice first needs it, e.g. clinical signing.)*
- [ ] Provider logout/revocation invalidates the session per the session architecture tests. *(Partial: local revocation is proven — `/auth/logout` revokes the Dentix session and `whoami` afterward returns `NO_SESSION`. The provider end-session URL is correctly returned but was not followed in the browser walkthrough, so Keycloak-side SSO invalidation itself is unverified.)*
- [x] Realm export/import restore rehearsed once. *(S3-1: container torn down and rebuilt from only the committed `keycloak/dentix-realm.json`, twice.)*

**2 of 4 proven this slice. Status stays Proposed** — same reasoning as ADR-006: accepting is a governance call, not assumed here.
