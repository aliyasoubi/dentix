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

**Non-negotiable operational requirements regardless of host:**

1. **Backups:** PostgreSQL continuous WAL archiving (pgBackRest or wal-g) to meet RPO 15 min, plus nightly full backups; MinIO bucket replication or scheduled sync. All backups encrypted and stored in a **second failure domain** (different provider or physical location than the primary host).
2. **Dependency access:** npm/Docker registry mirror or pull-through cache decided during Release 0.5 so a registry block cannot stop builds (R-03).
3. **Restore drill** into an isolated environment before Release 1 exits, then per `06-operations/02-backup-recovery.md`.
4. **Named operator** with a written runbook; a second person must complete one supervised restore (R-07).
5. Kubernetes and multi-node orchestration are explicitly rejected for v1 — operational cost with no availability benefit at this scale.

## Acceptance checklist

- [ ] Host pattern chosen and named operator recorded here. *(Recommended: domestic VPS, per the table above — not yet a recorded decision; this is the operator's call.)*
- [ ] Walking skeleton deployed to the chosen host over TLS. *(Rehearsed against the production Compose stack + Caddy TLS locally — `ops/README.md`. Not yet deployed to an actual VPS; no host has been chosen.)*
- [x] Backup pipeline running; one timed restore meets RPO/RTO on paper for the fixture dataset. *(`ops/backup/` — pg_dump custom format, GPG AES256 encryption, sha256 integrity check, cron-scheduled. Two restores actually run against the rehearsal stack: both under 1 second, both byte-for-byte matching the live database. RTO is on track — a real restore's steps scale but stay well inside 4h. **RPO does not meet the 15-minute target**: this pipeline is once-daily, giving up to 24h RPO; continuous WAL archiving (pgBackRest/wal-g, item 1 above) is explicitly deferred to pre-pilot by `07-plans/00-build-sequencing.md`, not a Release 1 requirement. Also unresolved: no off-host copy is configured yet — `BACKUP_RCLONE_REMOTE` needs a real second-failure-domain destination, an operator decision like the host choice itself. See `ops/README.md`'s Backups section for the full accounting.)*
- [ ] Registry mirror/cache strategy verified by building the stack with the public registry blocked. *(Not attempted. `apps/api/Dockerfile` tunes npm's retry/timeout for a slow connection, which is a different problem from a blocked one.)*
