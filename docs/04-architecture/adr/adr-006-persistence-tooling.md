# ADR-006: Persistence and Migration Tooling

- **Status:** Proposed — must be accepted during Release 0.5
- **Gap identified in design review:** the baseline mandates PostgreSQL, immutable migrations, and mapper-isolated domain entities, but never selects the ORM/query/migration toolchain.

## Options to evaluate
1. **TypeORM** — default NestJS pairing; weaker type safety; migration tooling adequate.
2. **Prisma** — strong types and migration DX; schema-first may fight the mapper/port rules in 04-architecture/03; runtime layer adds constraints.
3. **Kysely (or Drizzle) + node-pg-migrate** — typed SQL, thin, fits explicit-mapper architecture best; more hand-written SQL.

## Decision drivers
Mapper isolation rule (ORM records never exposed), append-only/version tables, bigint rial columns, expand-and-contract migrations, report read models needing real SQL, team familiarity.

## Decision
_To be recorded. Include chosen tool, migration workflow, and transaction/outbox integration pattern._
