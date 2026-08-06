# ADR-010: Hosting and Operations Model

- **Status:** Proposed — recommended decision below; blocking gate before any deployment
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

- [ ] Host pattern chosen and named operator recorded here.
- [ ] Walking skeleton deployed to the chosen host over TLS.
- [ ] Backup pipeline running; one timed restore meets RPO/RTO on paper for the fixture dataset.
- [ ] Registry mirror/cache strategy verified by building the stack with the public registry blocked.
