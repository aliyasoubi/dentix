# Deployment runbook — local rehearsal, then VPS

The point of this directory is that **the local rehearsal and the VPS run the
same `docker-compose.prod.yml` with the same variables.** Only the values in
`.env.production` differ. A rehearsal that used a different compose file, a
different TLS story, or a different Keycloak mode would prove much less.

Backups are now built and drilled (see "Backups" below) — but read that
section's honest RPO number before treating this as production-ready. See
"Still missing" at the bottom for what genuinely still blocks real patient
data.

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

## Backups

`06-operations/02-backup-recovery.md`: "automated encrypted backups run from
Release 1." The `backup` service does this — `ops/backup/` — cron-scheduled
inside its own container so the schedule comes up with `docker compose up`
rather than depending on whatever else is configured on the host.

**One-time setup**, before the first `up`:

```bash
openssl rand -base64 32 > ops/backup/passphrase
chmod 600 ops/backup/passphrase
touch ops/backup/rclone.conf   # empty is fine until you configure a remote — see below
```

Both files are gitignored; `ops/backup/*.example` are the committed
templates. **Store the passphrase somewhere outside this host** (a password
manager, printed and locked in a drawer) — losing it makes every backup
permanently unreadable, which defeats the entire point.

**What each backup does** (`ops/backup/backup-postgres.sh`):
`pg_dump --format=custom` → `gpg --symmetric --cipher-algo AES256` → the
plaintext dump is deleted immediately, never left on disk → a `.sha256`
checksum is written alongside it → local files older than
`BACKUP_RETENTION_DAYS` (default 14) are pruned → if `BACKUP_RCLONE_REMOTE`
is set, the encrypted file is copied off-host and the same retention is
applied there too.

**Run one on demand** (don't wait for the 03:00 UTC schedule to check it works):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec backup /scripts/backup-postgres.sh
```

**Restore into an isolated database** — never the live one; that's what
`06-operations/02-backup-recovery.md`'s restore procedure requires before any
promotion:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec backup sh -c 'ls -t /backups/*.dump.gpg | head -1'   # pick a backup

docker compose -f docker-compose.prod.yml --env-file .env.production \
  exec backup /scripts/restore-postgres.sh /backups/<file>.dump.gpg restore_drill
```

It verifies the checksum before decrypting, restores into the named database
(`restore_drill` here — anything but the real `POSTGRES_DB` name), and prints
elapsed time. Validate the data, then `DROP DATABASE restore_drill` when done
— it is scratch space, not a standing second copy.

### Drilled, not just built

Two restores were actually run against this rehearsal stack, not asserted:

- Both completed in under a second and both matched the live database
  exactly — same office UUID, same row counts across `office`,
  `office_user`, `user_account`, and all 5 applied migrations present.
- `pg_restore --list` against the encrypted file directly failed as expected
  ("does not appear to be a valid archive") and `gpg --list-packets`
  confirmed `AES256.CFB encrypted data` — the file is genuinely encrypted,
  not just named `.gpg`.

**That sub-second number is not the real-world RTO.** This rehearsal's
dataset is walking-skeleton scale — one office, one user, no patients (the
one thing this drill couldn't include: creating a patient needs an
authenticated browser session, which needs the CA-trust step that's yours to
run). A real office's database will be larger and `pg_restore` time scales
with it, and the 8-step procedure in `06-operations/02-backup-recovery.md`
includes declaring an incident, validating referential integrity, and
obtaining recovery approval — steps this drill didn't exercise because there
was nothing wrong to declare. What's actually proven: the mechanism is
correct end to end (encryption, integrity check, restore, data fidelity).
What's still estimated, not measured: total RTO against a real dataset and a
real incident.

### The honest gap: RPO is 24 hours, not 15 minutes

`07-plans/risks.md` (R-04) and ADR-010 both target **RPO 15 minutes**. This
pipeline runs once daily. Worst case — data changes right after the 03:00
backup and the host is lost an hour before the next one — **up to 24 hours of
data is unrecoverable.** That gap is real and is not hidden in a comment
somewhere: `07-plans/00-build-sequencing.md` explicitly defers "RPO
15-minute/PITR infrastructure" to **pre-pilot**, not Release 1 — closing it
means continuous WAL archiving (pgBackRest or wal-g, ADR-010's own
recommendation), which is meaningfully more operational surface than a daily
dump and belongs to that later stage, not bolted on here to make a number
look better today.

**What is NOT done, and is the operator's call, not mine:** the off-host
copy. `BACKUP_RCLONE_REMOTE` is unset in this rehearsal — backups exist only
in the `dentix_prod_backups` Docker volume on this one host, which is **not**
a second failure domain. Losing the host loses the backups with it. Same
category of decision as ADR-010's hosting choice itself: rclone supports
dozens of destinations (a second VPS over SFTP, any S3-compatible bucket,
etc.) and which one makes sense is not something to default on your behalf.
See `ops/backup/rclone.conf.example` when you're ready to pick one.

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
7. **Set up backups before anything else touches this host**: the one-time
   setup in the Backups section, then decide and configure
   `BACKUP_RCLONE_REMOTE` — this is the step the local rehearsal deliberately
   left undone since it needs a real second location. Run one backup and one
   restore drill against the VPS itself before calling it done; the
   rehearsal's numbers don't transfer to different hardware.

Nothing else changes. That is the whole point of rehearsing locally first.

---

## Still missing before real patient data

ADR-010's acceptance checklist has four items:

- [x] Host pattern chosen and deployed.
- [x] Walking skeleton deployed over TLS.
- [x] Backup pipeline running; one timed restore performed (see "Backups"
      above) — with the RPO caveat stated there, not glossed over.
- [ ] Registry mirror/cache strategy, verified by building with the public
      registry blocked. Not attempted — R-03 (registry access from Iran) is
      mitigated today only by the Dockerfile's retry/timeout tuning, which
      helps a slow connection, not a blocked one.

Two gaps carry forward, both already named above rather than hidden:

1. **RPO is 24 hours, not the 15-minute target** — daily backups only; PITR
   is explicitly a pre-pilot item per `00-build-sequencing.md`, not a
   Release 1 gap.
2. **No off-host copy configured** — `BACKUP_RCLONE_REMOTE` needs a real
   second location, which is the operator's decision.

Fictional data is fine today. Real patient data needs both of these closed,
plus the Real-Data Authorization Gate (`05-quality/01-security-privacy.md`)
separately approved — that gate is not a deployment concern at all and isn't
addressed by anything in this directory.
