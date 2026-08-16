# Keycloak — dentix realm (ADR-007)

`dentix-realm.json` is the reviewable, restorable source of truth for the realm. It defines **two
confidential clients** and `CONFIGURE_TOTP` as a default required action so every account must
enroll TOTP on first login:

- **`dentix-bff`** — the browser login (Authorization Code + PKCE/S256, redirect URI
  `http://localhost:3000/api/v1/auth/callback`).
- **`dentix-admin-lookup`** — a service account the API uses to find a user by email when adding
  an office user. `client_credentials` only, and its sole permission is `realm-management`'s
  `view-users`. It replaced the master-realm admin credentials the API used to hold.

That second client needs **both** halves to work: the role assigned to its service account (the
one `users` entry in the export) _and_ that role listed in `clientScopeMappings`. With
`fullScopeAllowed: false` and no scope mapping, the role is assigned but stripped from every
issued token, and every admin call returns 403.

`docker-compose.yml` imports this file automatically on every `keycloak` container start
(`start-dev --import-realm`) — the container itself is disposable.

**Deliberately not in the export:** the two client secrets (Keycloak regenerates fresh ones on
every import) and human user accounts (data, not configuration, and dev/test-only regardless).
Both are recreated by the two steps below. The one `users` entry that _is_ in the export is the
lookup client's service account, which carries no credentials — it is client configuration that
Keycloak materialises as a user.

## First-time setup after `docker compose up -d keycloak`

1. **Fetch both regenerated client secrets** into `.env`:

   ```bash
   ./keycloak/fetch-dev-secrets.sh >> .env
   ```

   It prints `OIDC_CLIENT_SECRET`, `KEYCLOAK_ADMIN_CLIENT_ID` and
   `KEYCLOAK_ADMIN_CLIENT_SECRET`. Both secrets are needed: the first for logging in at all, the
   second for adding an office user. Fetching only the BFF's — which this step used to do — makes
   add-user fail with a confusing error long after setup appears to have worked.

2. **Create the dev test user** (idempotent, safe to re-run):

   ```bash
   ./keycloak/seed-dev-user.sh
   ```

   Username `dr.dev`, password `DevPassword123!` — dev-only, never used for anything real. First
   login prompts for TOTP enrollment (any authenticator app).

## Re-exporting after a manual config change

If you change anything via the admin console (http://localhost:8080, `admin` /
`admin_dev_only` from `.env`) that should be permanent, re-export and **filter it** — a raw
partial-export also carries Keycloak's auto-generated roles for the built-in system clients
(`account`, `admin-cli`, `broker`, `realm-management`, `security-admin-console`), and re-importing
those verbatim collides with the same roles Keycloak creates itself on realm bootstrap
(`ModelDuplicateException`, crash-loops the container). Keep the entries belonging to **both**
`dentix-bff` and `dentix-admin-lookup` in `clients`, `roles.client`, and `clientScopeMappings`,
keep the `service-account-dentix-admin-lookup` entry in `users`, and always strip `secret`.
Dropping the lookup client or its scope mapping silently breaks adding office users. Verify by tearing
down and re-creating the container from the file alone before committing — that's the actual
proof this restores correctly, not just that it looks right.
