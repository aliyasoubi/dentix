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

- [x] Login → MFA → BFF callback → `__Host-dentix_session` cookie works against the deployed provider. *(S3: proven in a real browser against the running Keycloak container — password, forced TOTP enrollment, landed back authenticated, `whoami` returned the correct identity.)* **Known gap, tracked not silently accepted:** MFA is enforced realm-side only — `CONFIGURE_TOTP` as a default required action, empirically verified to block an account with zero 2FA credentials from completing password-only login. There is currently no per-login, OIDC-claim-level proof that MFA occurred: Keycloak 26.7's built-in `oidc-amr-mapper` (added to the `dentix-bff` client) returns `amr: []` for the classic username/password + OTP-form authenticators actually used here — verified against a real token exchange, not assumed. `CompleteLoginUseCase` records `mfaContext` as best-effort/informational only; it cannot reject a login on a missing MFA claim without breaking every real login today. Revisit if Keycloak's amr support improves, or via acr-based step-up configuration, before relying on `mfaContext` for anything security-load-bearing (e.g. gating a sensitive action on "this specific session used MFA").
- [ ] `prompt=login` re-authentication satisfies the recent-authentication window check. *(Not built in S3 — `UserSession.isRecentlyAuthenticated()` exists and is exposed via whoami, but the `RECENT_AUTHENTICATION_REQUIRED` → fresh `prompt=login` flow itself belongs to whichever slice first needs it, e.g. clinical signing.)*
- [ ] Provider logout/revocation invalidates the session per the session architecture tests. *(Partial: local revocation is proven — `/auth/logout` revokes the Dentix session and `whoami` afterward returns `NO_SESSION`. The provider end-session URL is correctly returned but was not followed in the browser walkthrough, so Keycloak-side SSO invalidation itself is unverified.)*
- [x] Realm export/import restore rehearsed once. *(S3-1: container torn down and rebuilt from only the committed `keycloak/dentix-realm.json`, twice — plus twice more in the hardening pass below, four rehearsals total.)*

**Hardening pass (post-S3, external review):** the realm as first exported had `bruteForceProtected: false` and the recovery-code authenticator `DISABLED`, contradicting this ADR's own "recovery codes generated at enrollment" text. Fixed and proven, not just toggled: `bruteForceProtected: true`, `failureFactor: 5` (down from Keycloak's default 30 — 30 failed attempts before any protection is too permissive for a system with patient data), `permanentLockout: false` (temporary lockout only, so an attacker can't weaponize the protection into a permanent denial-of-service against a legitimate user). Proven via a real 6-attempt run against a rebuilt container: 5 wrong passwords, then the 6th attempt with the *correct* password was still rejected, and Keycloak's own attack-detection API (`GET .../attack-detection/brute-force/users/{id}`) confirmed `"disabled": true` for that user at that point — not inferred from the generic error message alone. `auth-recovery-authn-code-form` flipped from `DISABLED` to `ALTERNATIVE` in both `Browser - Conditional 2FA` and `First broker login - Conditional 2FA` (the latter unused today — no IdP brokering configured — fixed for consistency). This only makes the authenticator available; no recovery-code *enrollment* flow exists yet, so no account has one to use. Building that enrollment UX is a later slice, not claimed here.

**2 of 4 proven this slice. Status stays Proposed** — same reasoning as ADR-006: accepting is a governance call, not assumed here.
