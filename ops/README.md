# Deployment runbook — local rehearsal, then VPS

The point of this directory is that **the local rehearsal and the VPS run the
same `docker-compose.prod.yml` with the same variables.** Only the values in
`.env.production` differ. A rehearsal that used a different compose file, a
different TLS story, or a different Keycloak mode would prove much less.

What this is _not_ yet: backed up. See "Still missing" at the bottom — that is
the remaining ADR-010 acceptance item and it blocks real patient data, not the
rehearsal.

---

## How this differs from the dev stack

`docker-compose.yml` (dev) runs infrastructure only; the API runs on your host
via `nest start --watch`. `docker-compose.prod.yml` is the deployed shape:

|            | dev (`docker-compose.yml`)       | production (`docker-compose.prod.yml`) |
| ---------- | -------------------------------- | -------------------------------------- |
| API        | `nest start --watch` on the host | built image, compiled `dist`           |
| Angular    | host build, served by host API   | built into the image                   |
| TLS        | none (`http://localhost:3000`)   | Caddy, real certificate                |
| Keycloak   | `start-dev`, embedded H2         | `start`, backed by Postgres            |
| Migrations | run by hand                      | one-shot service the API waits on      |
| Swagger UI | on (`ENABLE_API_DOCS=true`)      | off — the gate fails closed            |

The Keycloak difference is the one most likely to bite: `start-dev` keeps its
data in an embedded H2 database that is **destroyed when the container is
replaced**, taking every user's TOTP enrolment with it.

---

## Local rehearsal

Everything runs on your machine. `*.localhost` resolves to 127.0.0.1 on
macOS and in current browsers, so no `/etc/hosts` editing is needed.

Local runs add `-f docker-compose.local-tls.yml`, which teaches the API to
trust Caddy's self-signed CA. That overlay is the one deliberate
local-vs-deployed difference, and it exists only because the certificate is
self-signed — see the file's own header.

**1. Create the env file**

```bash
cp .env.production.example .env.production
```

Then edit it: set `POSTGRES_PASSWORD` and `KEYCLOAK_ADMIN_PASSWORD` to real
values, and generate the session key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Leave `OIDC_CLIENT_SECRET` at its placeholder for now. It has to be
_something_ — Compose interpolates every service in the file even when you
start a subset, so an empty value blocks the very `up` that brings Keycloak
online to generate the real secret.

**2. Stop the dev stack first** — it holds ports 5433/8080 and would compete:

```bash
docker compose down
```

**3. Start the infrastructure** (not the API yet — it needs the client secret
that Keycloak generates on first realm import):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local-tls.yml \
  --env-file .env.production up -d --build postgres keycloak caddy
```

**4. Fetch the OIDC client secret and put it in `.env.production`**

```bash
./ops/local/fetch-client-secret.sh
```

Replace the placeholder `OIDC_CLIENT_SECRET=` line with the printed one.

**5. Start the rest** (runs migrations, then the API):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.local-tls.yml \
  --env-file .env.production up -d --build
```

**6. Seed the office and a user.** The production image contains no seed
scripts by design, so these run from the repo. Note both env overrides — they
are not optional:

```bash
set -a && . ./.env.production && set +a

# Keycloak has no published port here (ADR-007 keeps the admin surface off
# the network), so reach it through Caddy, trusting Caddy's CA.
docker compose -f docker-compose.prod.yml --env-file .env.production \
  cp caddy:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt
KEYCLOAK_URL="https://${DENTIX_AUTH_DOMAIN}" CURL_CA_BUNDLE=/tmp/caddy-root.crt \
  ./keycloak/seed-dev-user.sh          # prints the new user's id

# OIDC_ISSUER_URL must match what the API will compute at login. Without it
# the script records the dev default (http://localhost:8080/...), the subject
# identifiers never match, and login fails with NO_ACTIVE_ACCOUNT.
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT="${POSTGRES_HOST_PORT}" \
OIDC_ISSUER_URL="https://${DENTIX_AUTH_DOMAIN}/realms/dentix" \
  npx ts-node -T apps/api/scripts/bootstrap-dev-office-user.ts <keycloak-user-id>
```

**7. Trust the CA, then open <https://dentix.localhost>.**

Caddy issued the certificate from its own internal CA, which your OS does not
trust yet. Clicking through the warning is not enough here — the OIDC flow
redirects between two hostnames and some browsers refuse a self-signed origin
outright — so install the root certificate once:

```bash
# macOS; needs your password, so run it yourself
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain /tmp/caddy-root.crt
```

**Rehearsal is successful when** you can log in through Keycloak over HTTPS
(first login enrols TOTP), create a patient, and see it in the list — all
against built images, not `ng serve`.

### Verified so far

Everything up to the interactive login has been exercised end to end against
this stack:

- Keycloak in production mode on Postgres, healthy; realm imported.
- Migrations applied by the one-shot `api-migrate` service.
- HTTPS through Caddy with genuine certificate verification (not `curl -k`).
- `/health` and `/api/v1/bootstrap` → 200.
- `/` serves the Angular shell with `lang="fa-IR" dir="rtl"` from inside the
  container, and `/patients` deep-links to it rather than 404ing — which is
  what proves the image's `WEB_BUILD_ROOT` wiring.
- `/api/docs` → **404**, confirming the Swagger gate fails closed in production.
- `/api/v1/auth/login` → 302 to Keycloak carrying PKCE `S256` and the HTTPS
  production `redirect_uri`; Keycloak serves the real "Sign in to Dentix" form
  over TLS in response.

The remaining step is the interactive one: entering credentials, enrolling
TOTP, and creating a patient in a browser. It needs the CA trusted (your
password) and a TOTP app, so it is yours to run.

---

## Moving to the VPS

The stack is host-agnostic; this is a data and DNS exercise, not a redesign.

1. **DNS.** Point both names at the VPS: `dentix.example.com` and
   `auth.dentix.example.com` (A records). Both must resolve publicly before
   Caddy can obtain certificates — Let's Encrypt validates over HTTP.
2. **Firewall.** Allow 80 and 443 only. Nothing else in this stack should be
   reachable from outside the host.
3. **Copy the repo and create `.env.production`** with production values:
   - `DENTIX_APP_DOMAIN` / `DENTIX_AUTH_DOMAIN` → the real names
   - `ACME_EMAIL` → a real address (Let's Encrypt expiry notices)
   - fresh `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`,
     `SESSION_ENCRYPTION_KEY` — never reuse the rehearsal's
4. **Delete the `ports:` block from the `postgres` service** in
   `docker-compose.prod.yml`. It exists only so the rehearsal can seed from
   the host.
5. **Update the realm's redirect URIs.** `keycloak/dentix-realm.json`
   registers the localhost and `dentix.localhost` callbacks; the deployed
   client needs `https://<your-domain>/api/v1/auth/callback` in
   `redirectUris`, `webOrigins`, and `post.logout.redirect.uris`. Edit before
   first import, or through the admin console after.
6. **Bring it up**, then repeat steps 4–7 above (fetch client secret, seed,
   verify) against the real domain. TLS is automatic — no cert steps, no
   trust steps; the browser warning from the rehearsal does not recur because
   Let's Encrypt is already trusted.

Nothing else changes. That is the whole point of rehearsing locally first.

---

## Still missing before real patient data

ADR-010's acceptance checklist has four items. The rehearsal above covers the
deployment and TLS ones. **Backups are not built yet**, and that is the real
gate:

- No WAL archiving, so the RPO 15-minute target is currently unmet.
- No nightly base backup, no off-host copy, no restore drill.

`06-operations/02-backup-recovery.md` specifies the target. Until it is built
and one timed restore has actually been performed, this stack is fine for
fictional data and unfit for a real office — losing the host means losing the
practice's records. That, not the deployment, is what stands between here and
production, and it is deliberately called out rather than left implicit.
