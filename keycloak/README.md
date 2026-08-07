# Keycloak — dentix realm (ADR-007)

`dentix-realm.json` is the reviewable, restorable source of truth for the realm: one confidential
client (`dentix-bff`, Authorization Code + PKCE/S256, redirect URI
`http://localhost:3000/api/v1/auth/callback`), and `CONFIGURE_TOTP` set as a default required
action so every account must enroll TOTP on first login. `docker-compose.yml` imports it
automatically on every `keycloak` container start (`start-dev --import-realm`) — the container
itself is disposable.

**Deliberately not in the export:** the client secret (Keycloak regenerates a fresh one on every
import) and user accounts (data, not configuration, and dev/test-only regardless). Both are
recreated by the two steps below.

## First-time setup after `docker compose up -d keycloak`

1. **Fetch the regenerated client secret** and put it in `.env` as `OIDC_CLIENT_SECRET`:

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin&password=admin_dev_only&grant_type=password&client_id=admin-cli" \
     | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
   UUID=$(curl -s "http://localhost:8080/admin/realms/dentix/clients?clientId=dentix-bff" \
     -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")
   curl -s "http://localhost:8080/admin/realms/dentix/clients/$UUID/client-secret" \
     -H "Authorization: Bearer $TOKEN"
   ```

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
(`ModelDuplicateException`, crash-loops the container). Keep only `dentix-bff`'s own entries in
`clients`, `roles.client`, and `clientScopeMappings`, and always strip `secret`. Verify by tearing
down and re-creating the container from the file alone before committing — that's the actual
proof this restores correctly, not just that it looks right.
