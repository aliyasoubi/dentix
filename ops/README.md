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

Everything runs on your machine. `*.localhost` resolves to 127.0.0.1 in
current browsers, so no `/etc/hosts` editing is needed.

**1. Create the env file**

```bash
cp .env.production.example .env.production
```

Then edit it: set `POSTGRES_PASSWORD` and `KEYCLOAK_ADMIN_PASSWORD` to real
values, and generate the session key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**2. Stop the dev stack first** — it holds ports 5433/8080 and would compete:

```bash
docker compose down
```

**3. Start the infrastructure** (not the API yet — it needs the client secret
that Keycloak generates on first realm import):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build postgres keycloak caddy
```

**4. Fetch the OIDC client secret and put it in `.env.production`**

```bash
./ops/local/fetch-client-secret.sh
```

Copy the printed `OIDC_CLIENT_SECRET=...` line into `.env.production`,
replacing the empty one.

**5. Start the rest** (runs migrations, then the API):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**6. Seed the office and a user.** The production image contains no seed
scripts by design, so these run from the repo against the loopback-published
Postgres port:

```bash
./keycloak/seed-dev-user.sh                      # creates dr.dev in Keycloak
POSTGRES_PORT=5434 npx ts-node -T apps/api/scripts/bootstrap-dev-office-user.ts <keycloak-user-id>
```

**7. Open <https://dentix.localhost>.**

Your browser will warn about the certificate: Caddy issued it from its own
internal CA, which the OS does not trust yet. Either click through (you will
need to do it for `auth.dentix.localhost` too, since the login redirect goes
there), or trust the CA once:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  cp caddy:/data/caddy/pki/authorities/local/root.crt /tmp/caddy-root.crt
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain /tmp/caddy-root.crt   # macOS
```

The API itself already trusts that CA — `docker-compose.prod.yml` mounts
Caddy's data volume read-only and points `NODE_EXTRA_CA_CERTS` at the root
certificate, because the server-to-server token exchange with Keycloak goes
over the same HTTPS URL the browser uses.

**Rehearsal is successful when** you can log in through Keycloak over HTTPS,
create a patient, and see it in the list — all against images, not `ng serve`.

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
