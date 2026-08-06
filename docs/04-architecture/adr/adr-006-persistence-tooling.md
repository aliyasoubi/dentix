# ADR-006: Persistence and Migration Tooling

- **Status:** Proposed — recommended decision below; accept during Release 0.5 after the walking-skeleton proofs pass
- **Constraint:** the architecture (module boundaries, explicit mappers, migration-managed schema) is fixed; this ADR only selects the tool that implements it.

## Recommended decision

**TypeORM 0.3.x in migration-only mode** (`synchronize` disabled in every environment including local development), with:

1. **Explicit entity registration per module** — no glob-based entity auto-loading. Each module's infrastructure layer exports its entity list; the data source composes them. (Glob loading silently registers duplicate files — a failure mode already observed in the predecessor inventory codebase.)
2. **Repository implementations live in `infrastructure/persistence` only** and satisfy the ports defined in `application/ports`. ORM entities never cross into `domain/` or API responses — explicit mappers, per `03-module-boundaries.md`.
3. **Raw SQL where the invariant demands it:** outbox claiming (`FOR UPDATE SKIP LOCKED`), append-only ledger posting functions, and any statement where generated SQL would obscure the locking or constraint behavior.
4. **`bigint` money columns mapped to JS `bigint`** via column transformers; a shared transformer in the kernel, never per-module copies.
5. **Migrations are hand-reviewed.** Generated diffs may seed a migration but are always read and edited before commit; every migration has a tested `down` or a documented irreversibility note.

## Why TypeORM over the alternatives

| Option | Assessment |
|---|---|
| **TypeORM** (recommended) | Team already ships production code with it; first-class NestJS integration; supports migrations, pessimistic locks, `bigint`, raw SQL. Its weaknesses (query-builder ergonomics, historically loose typing) are fenced off by the mapper/port rules above. Team familiarity is the strongest driver for a small team. |
| Prisma | Best-in-class migration DX and typing, but its client model duplicates the domain layer this architecture already mandates, and raw-SQL escape hatches would carry the locking-critical paths anyway. Net new learning for less benefit here. |
| MikroORM | Good DDD fit (Unit of Work), smaller community; migration risk for no decisive advantage over the fenced TypeORM setup. |
| Kysely / Drizzle (query builders) | Maximal SQL control, but pushes all mapping and change-tracking effort onto the team; better suited when no ORM experience exists to reuse. |

## Acceptance checklist (Release 0.5 proofs)

- [ ] One migration-managed table created, migrated up and down in CI against PostgreSQL 18.
- [ ] One entity mapped ORM ↔ domain ↔ API through explicit mappers with zero ORM imports in `domain/` (verified by the architecture lint rule).
- [ ] `FOR UPDATE SKIP LOCKED` outbox claim query working under two concurrent workers in an integration test.
- [ ] `bigint` rial value round-trips DB → domain → API decimal string → DB without precision loss.
- [ ] CI fails if an entity file exists that is not explicitly registered.
