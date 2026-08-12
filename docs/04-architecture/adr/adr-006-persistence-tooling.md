# ADR-006: Persistence and Migration Tooling

- **Status:** Proposed — accept via the acceptance checklist below
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

- [x] One migration-managed table created, migrated up and down in CI against PostgreSQL 18. *(S2: `office` table; verified locally against real Postgres 18 and wired as a CI step — "Migration up / down / up".)*
- [x] One entity mapped ORM ↔ domain ↔ API through explicit mappers with zero ORM imports in `domain/` (verified by the architecture lint rule). *(S2 proved ORM ↔ domain. The ↔ API leg is now proven too, by the patients slice: `PatientOrmEntity` → `PatientMapper` → the domain `Patient` entity → `CreatePatientUseCase` → `CreatePatientRequestDto`/`CreatePatientResponseDto` at `PatientsController`. Zero ORM imports in `domain/` across both, enforced by `lint:arch`.)*
- [x] `FOR UPDATE SKIP LOCKED` outbox claim query working under two concurrent workers in an integration test. *(Post-S8: 00-build-sequencing.md explicitly sanctions this — "Keep the outbox schema now, but do not build a generic event-consumption platform before actual consumers exist. The schema is cheap; the platform around it is not." `outbox_event` (migration `1786479238032-CreateOutboxEvent`) carries the full 08-transaction-event-semantics.md envelope; `apps/api/src/modules/outbox/` mirrors the `audit` module's shape (domain/repositories/infrastructure, no controller, no BullMQ producer/consumer — that stays R2). `TypeOrmOutboxEventRepository.claimBatch` is raw SQL per this ADR's own "Recommended decision" §3, not the query builder. Proven in `test/integration/outbox.int-spec.ts` against real concurrent Postgres transactions, not simulated: a claim held open by an in-flight transaction makes a concurrent claim return empty immediately rather than blocking (the actual SKIP LOCKED-vs-plain-FOR-UPDATE distinction), and two workers claiming concurrently from a shared 6-row pool partition it with zero overlap and zero gaps once each worker's claim marks its rows published before committing — the same "mark it off the table before you let go of the lock" step a real publisher would perform.)*
- [ ] `bigint` rial value round-trips DB → domain → API decimal string → DB without precision loss. *(S6: the DB and API legs still can't be proven — no money column, mapper, or endpoint exists yet; that's real future work, not this checklist item pretending otherwise. What S6 does prove, with both example and property-based tests (`packages/kernel/src/money.spec.ts`, `money.property.spec.ts`, ~1,100 randomized cases per run): the bigint arithmetic itself never loses precision at any magnitude, the branded `Money` type (same `Branded<>` pattern as `Uuid`) makes an unvalidated bigint uninsertable at the type level, and the `amountRial` decimal-string (de)serialization this item names is already exact — `parseAmountRialString(amountRialToString(money)) === money` for every value in the signed-bigint column's range, proven, not assumed. The transformer mapping a real `bigint` column to this `Money` type per the "Recommended decision" §4 above is what's still missing, and needs its own table before this item can close.)*
- [x] CI fails if an entity file exists that is not explicitly registered. *(S2: `scripts/check-entity-registration.ts`, proven against a real planted violation, wired into `lint:arch` and CI.)*

**4 of 5 proven now (2 in S2, 1 with the patients slice, 1 post-S8). Status stays Proposed** — accepting the ADR is a governance call, not an implementation detail; see the human-review note in the S2 write-up. The remaining item (money DB↔API round trip) needs a real money-bearing table/endpoint this release doesn't have a product reason to build yet — not stalled, genuinely blocked on the finance feature per `00-build-sequencing.md`.
