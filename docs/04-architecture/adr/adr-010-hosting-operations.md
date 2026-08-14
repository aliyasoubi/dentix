# ADR-010: Hosting and Operations Model

- **Status:** Proposed — blocking gate before any deployment; accept via the acceptance checklist below
- **Context:** one Iranian office; foreign cloud, registries, and SaaS may be unreliable or restricted from Iran (risk R-03); targets are RPO 15 min / RTO 4 h (NFRs); the operator is a very small team.

## Recommended decision

**A single Docker-Compose stack on one host, with every service self-hosted**, in this composition:

reverse proxy (Caddy or nginx, TLS) · `api` · `worker` · PostgreSQL 18 · Redis · MinIO (S3-compatible) · OIDC provider (ADR-007) · monitoring agent.

**Host choice — decide one, both patterns are supported by this stack:**

| Pattern | When it wins | Cost |
|---|---|---|
| **Domestic Iranian VPS** (recommended starting point) | No office hardware to buy/maintain; provider handles power/network; reachable from home for a personal project | Clinic operation depends on office internet to reach it |
| Office on-prem mini-server | Clinic keeps working during international/upstream internet outages (LAN-only path); data physically in the office | Owner maintains hardware, UPS, and physical security |

Starting on a domestic VPS and moving on-prem later (or the reverse) is a data-migration exercise, not a redesign — the Compose stack is host-agnostic.

**Decision recorded (2026-08-14, Ali, product owner):** the on-prem pattern,
applied informally — this developer's own machine, not purpose-built office
hardware. Chosen to unblock Release 0.5 and start Release 1 without waiting
on a VPS purchase or an office-hardware decision that depends on DISC-001
(office hardware/network survey, still open). The ADR's own text is what
makes this safe to choose now rather than deliberate further: moving to a
VPS or a real office server later is a data-migration exercise, not a
redesign.

Honest about where this diverges from the "office mini-server" the pattern
describes, so the gap is tracked rather than quietly inherited:

- Not dedicated hardware — a developer laptop, not something bought and
  provisioned to run unattended.
- No UPS or physical security beyond whatever this machine already has.
- `*.localhost` domains resolve only *on this machine* — nothing else on
  any network can reach it yet. Office-LAN reachability (a real local
  domain, or a tunnel) is a separate, later decision, not implied by this
  one.
- Uptime is this laptop's uptime — sleep, reboots, and travel all take the
  stack down with it. Acceptable for proving deployment mechanics and
  starting Release 1; not something to carry into a real office pilot
  without revisiting.
- Second-failure-domain backup destination is an explicit, acknowledged
  gap for now (see the acceptance checklist below) — the operator's choice,
  deferred rather than defaulted to something invented for them.

**Non-negotiable operational requirements regardless of host:**

1. **Backups:** PostgreSQL continuous WAL archiving (pgBackRest or wal-g) to meet RPO 15 min, plus nightly full backups; MinIO bucket replication or scheduled sync. All backups encrypted and stored in a **second failure domain** (different provider or physical location than the primary host).
2. **Dependency access:** npm/Docker registry mirror or pull-through cache decided during Release 0.5 so a registry block cannot stop builds (R-03).
3. **Restore drill** into an isolated environment before Release 1 exits, then per `06-operations/02-backup-recovery.md`.
4. **Named operator** with a written runbook; a second person must complete one supervised restore (R-07).
5. Kubernetes and multi-node orchestration are explicitly rejected for v1 — operational cost with no availability benefit at this scale.

## Acceptance checklist

- [x] Host pattern chosen and named operator recorded here. *(On-prem pattern, applied to the developer's own machine — see "Decision recorded" above. Operator: Ali.)*
- [x] Walking skeleton deployed to the chosen host over TLS. *(The chosen host is no longer hypothetical — see "Decision recorded" above. Deployed and proven mechanically: `docker compose -f docker-compose.prod.yml -f docker-compose.local-tls.yml --env-file .env.production up -d --build` brought up every service healthy on this machine; `/health` → 200, `/api/v1/bootstrap` → 200, `/api/docs` → 404 (Swagger gate fails closed), `/` serves `lang="fa-IR" dir="rtl"`, `/api/v1/auth/login` → 302 to Keycloak carrying PKCE `S256` — all over genuine HTTPS through Caddy, not `curl -k` glossed over. One real bug found and fixed doing this: this fresh Keycloak container regenerated `dentix-bff`'s client secret on its own realm import, same as the dev-stack incident earlier this release — `.env.production`'s stored secret was stale on first boot; fetched the live value from this instance and the `api` container was recreated to pick it up.
  **The interactive half is now proven too, not left to the operator to self-certify:** Ali ran the one step that genuinely needs `sudo` (`security add-trusted-cert -d -r trustRoot ...` to trust Caddy's self-signed root) — the one action in this whole pass that was correctly *not* done on his behalf, since it modifies system trust and needs his password. After that, a real browser session against `https://dentix.localhost` with **no `-k`, no `--cacert`, no warning interstitial** completed the whole path: password + forced TOTP enrollment against a freshly-imported realm (proving MFA is enforced here, not just on the dev realm), landed authenticated on `/patients`, and created a fictional patient (native name, phone) that appears correctly in the list with a real assigned `patient_number`. Confirmed to survive an unrelated image rebuild/redeploy (still present, same id, after the SVG-permissions fix below), so this wasn't a fluke of one container's lifetime.
  **A second real bug found doing this, unrelated to hosting itself:** `/brand/*.svg` returned 500 (`EACCES`) — the checked-in asset files were `600` on disk (a stale local `umask`, not anything git records; `git ls-files -s` shows the correct `100644`), and Angular's asset copy preserves source permission bits verbatim while every other file in `dist/` is generated output and never at risk. Fixed at the actual point of fragility — `apps/api/Dockerfile` now `chmod -R a+rX`s the built web tree after the build step, so the image is correct regardless of what umask produced the checkout that built it, not just on this machine. Verified: `/brand/dentix-icon.svg` → 200 after rebuild.)*
- [x] Backup pipeline running; one timed restore meets RPO/RTO on paper for the fixture dataset. *(`ops/backup/` — pg_dump custom format, GPG AES256 encryption, sha256 integrity check, cron-scheduled. Two restores actually run against the rehearsal stack: both under 1 second, both byte-for-byte matching the live database. RTO is on track — a real restore's steps scale but stay well inside 4h. **RPO does not meet the 15-minute target**: this pipeline is once-daily, giving up to 24h RPO; continuous WAL archiving (pgBackRest/wal-g, item 1 above) is explicitly deferred to pre-pilot by `07-plans/00-build-sequencing.md`, not a Release 1 requirement. Also unresolved: no off-host copy is configured yet — `BACKUP_RCLONE_REMOTE` needs a real second-failure-domain destination, an operator decision like the host choice itself; asked, and Ali's explicit choice (2026-08-14) is to leave this a known gap for now rather than default to a location invented for him. See `ops/README.md`'s Backups section for the full accounting. **Re-proven fresh against the actual designated host, not just inherited from the earlier rehearsal:** a real on-demand backup and restore ran against this deployment — the backup itself correctly self-reports "BACKUP_RCLONE_REMOTE not set — backup is local-only, NOT in a second failure domain yet" rather than silently succeeding as if the gap didn't exist — and the restore into `restore_drill` matched the live database exactly (6/6 migrations, identical row counts) before being dropped as scratch space.)*
- [ ] Registry mirror/cache strategy verified by building the stack with the public registry blocked. *(Attempted, and it fails the way the Dockerfile's own comment predicted: `docker build --network=none --no-cache -f apps/api/Dockerfile .` — total network isolation for the build, the clearest possible simulation of "blocked," with `--no-cache` because a build that already succeeded once would otherwise satisfy `npm ci` entirely from Docker's own layer cache without touching the network at all, which was the first, silently-wrong version of this test. Result: `npm ci` did not fail fast. It ran for **472 seconds (~8 minutes)** working through the Dockerfile's own retry/timeout tuning (5 retries, 120s max retry timeout, 900s overall) before giving up — and even then with an unclear npm-internal error ("Exit handler never called!") rather than a clean "registry unreachable" message. **Conclusion, stated plainly rather than left unattempted:** this item is not met. The existing tuning solves R-03's "slow or intermittent" case, which is what its own comment says it's for; it does not solve "blocked," which R-03 also names as a real risk for a build running from Iran. Closing this needs an actual registry mirror or pull-through cache (e.g. Verdaccio, or a self-hosted npm proxy) — infrastructure work, not a Dockerfile tuning knob, and not started.)*

**3 of 4 proven now.** Host chosen, deployed, and proven over genuine TLS end to end — login, MFA enrollment, and a created patient, not just the mechanical health checks — and the backup/restore mechanism re-proven against this exact host. Status stays Proposed: the registry-mirror gap is real and unresolved, and accepting is DISC-006's governance call regardless of proof count. The remaining item is infrastructure work (a real mirror or pull-through cache), not a proof that was skipped.
