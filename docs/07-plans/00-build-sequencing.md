# Build Sequencing: What Ships Now vs. Later

The architecture documents (`04-architecture/`, including the data model and the event catalog) describe the target design for the whole product lifecycle. They are not a Release 1 build list. Building all of it before Release 1 is overengineering for a single-office product that needs a working foundation first. This document is authoritative for *sequencing* — which capability is built now versus later — without changing the target design itself.

## First practical foundation (Release 1 scope)

Release 1 builds only:

1. Angular 22 with Angular Material/CDK.
2. Custom Dentix tokens and a small component library.
3. NestJS modular monolith and PostgreSQL.
4. Farsi-only RTL interface.
5. Jalali input/display with Gregorian/UTC storage.
6. Integer-rial money with explicit rial/toman display.
7. Basic OIDC/MFA and a server-side session.
8. Database migrations, authorization, and essential audit events.
9. Patient registration/search.
10. A basic appointment schedule.
11. One deployed fictional-data vertical slice.
12. Storybook for the first five or six shared components.

This list satisfies the two differences the office explicitly needs from day one: complete Iranian localization, and exact rial/toman handling. Everything else in the architecture docs is real, but later.

## Defer until capability

| Defer until | Capability |
|---|---|
| R2 | Messaging infrastructure: Redis, BullMQ, dead-letter queues, provider callbacks |
| R3–R5 | Complete event catalog implementation and downstream event handlers (`10-event-catalog.md`) |
| R4 | Generic process managers and full multi-module patient-merge coordination |
| R4 | Journey templates, laboratory automation, and reconciliation jobs |
| R5 | Finance approvals, separation of duties, day-close, full receipt reproduction |
| R6 | MinIO/S3 production setup, document scanning, retention automation |
| R6 | Event replay generations and sophisticated event-gap recovery |
| Before pilot | PITR/RPO 15-minute infrastructure, tracing, SLO dashboards, penetration testing, and full disaster-recovery exercises |

A Proposed ADR blocking one of these areas (see `open-decisions.md`) is accepted when the release that needs it starts, not before.

## Specific simplifications

- **Day-one dev stack is small.** Do not deploy Redis, BullMQ, MinIO, Keycloak, monitoring, worker, API, and PostgreSQL together on day one. Start with PostgreSQL, API, Angular, and a development identity provider.
- **Add Redis/BullMQ only when the first reliable asynchronous workflow exists** — not preemptively.
- **Add MinIO only when document storage starts** — not preemptively.
- **Keep the outbox schema now**, but do not build a generic event-consumption platform before actual consumers exist. The schema is cheap; the platform around it is not.
- **Do not retain OIDC access/refresh tokens** unless provider logout or another proven requirement needs them — see ADR-014. A local Dentix session after validated login is sufficient until that trigger is hit.
- **Patient merge ships incrementally**: alias and source-freeze first; module participants are added one at a time as each module is built. The full multi-module coordination shape in `04-data-model.md` is the Release 4 target, not a Release 1 requirement.
- **Keep `office_id` scoping now** — it is a low-cost safeguard, not overengineering.
- **Keep database-level appointment-overlap protection when scheduling is implemented** — the exclusion constraint in `04-data-model.md`'s Scheduling section prevents real data corruption and costs nothing extra to build correctly the first time.

## What this means when reading the architecture docs

`04-data-model.md`, `10-event-catalog.md`, and the ADRs remain authoritative for what the system eventually looks like. When a table, event, or decision in those documents belongs to a capability in the defer table above, it is annotated inline with when it is actually built. Absence of an annotation means it is in scope now.
