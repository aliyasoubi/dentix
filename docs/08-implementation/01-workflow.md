# AI Implementation Workflow

How an AI coding agent (Claude Code) turns this spec into verified, working code. The release plans in `07-plans/` say **what** to build and in what order; this document says **how each unit of work is executed and proven**. Authority follows `document-control.md` — this document never overrides a requirement, architecture rule, or ADR.

## Unit of work: the vertical slice

All implementation happens in **slices**. A slice is the smallest change that goes through every layer (migration → domain → application → infrastructure → presentation → UI where applicable) and ends in passing automated tests. Slices are defined per release in `02-slices-*.md` files using this template:

```
### S<n> — <name>
Spec:        <the requirement/architecture sections that define this behavior>
Module:      <one owning module from 07-context-module-map.md>
Builds:      <tables/commands/queries/components touched>
Tests first: <the failing tests to write before implementation, by layer>
Verify:      <exact commands that must pass>
Done when:   <observable outcome + which plan checkbox this ticks>
```

A slice with no test list is not implementable — fix the slice definition first, not the code.

## The loop (every slice, no exceptions)

1. **Read** the slice, then its `Spec:` references in full. Read the module's row in `04-architecture/07-context-module-map.md` and its tables in `04-data-model.md`.
2. **Restate** the acceptance as a concrete test list before writing any code. If the spec is ambiguous or silent, record the question in `00-review/design-review-gap-analysis.md` under open questions and choose the most conservative reading — never invent behavior, never widen scope.
3. **Write the failing tests** at the layers named in the slice. Run them; confirm they fail for the right reason.
4. **Implement the smallest code that passes**, inside the module layout of `03-module-boundaries.md`. New tables require a migration in the same slice.
5. **Verify** with the slice's commands, plus the always-on checks below. All green or the slice is not done.
6. **Self-review** against the relevant Definition of Done sections (`05-quality/04-definition-of-done.md`) — for most slices: module placement, migration safety, OpenAPI updated, audit/observability, tests.
7. **Record**: tick the checkbox in the release plan, note any deviation or open question in the PR/commit description.

**Stop conditions — halt and report instead of coding around:**
- The change would contradict an Accepted ADR (needs a replacement ADR).
- The change needs another module's tables or internals (needs a context-map update).
- A Proposed ADR (006–011) blocks the area (accept it first via its checklist).
- The work would touch real patient data in any form (Real-Data Authorization Gate).

## Test layers and where behavior is proven

| Layer | Proves | Tooling | Must not |
|---|---|---|---|
| Unit | Domain transitions, money/date conversion, normalization, permission decisions — pure logic | Jest, no I/O | Mock the domain itself |
| Integration | Repositories, migrations, DB constraints, outbox, locking, session store | Jest against Compose PostgreSQL/Redis | Mock the database — constraints are the point |
| API contract | OpenAPI shape, authorization matrix, error codes, idempotency, `If-Match` | supertest against a booted Nest app | Duplicate domain-rule tests |
| Component | Angular forms, RTL focus, custom controls | Angular testing + Storybook | Test business rules here |
| E2E | Persian critical journeys | Playwright | Grow beyond the journeys listed in `05-quality/02-test-strategy.md` |

Rule of thumb: an invariant enforced by the database (uniqueness, immutability, sign conventions, office scoping) gets an **integration** test that attempts to violate it; a rule enforced by domain code gets a **unit** test; a rule enforced at the boundary (auth, idempotency, concurrency preconditions) gets an **API** test.

## Canonical verification commands

The repository must expose exactly these scripts, wired in CI from the first slice; slices reference them by name:

| Command | Runs |
|---|---|
| `npm run lint` | ESLint + Prettier |
| `npm run lint:arch` | Module-boundary rules: no framework imports in `domain/`, no cross-module repository imports, no unregistered entity files, adapter-only Jalali imports |
| `npm run test` | All unit tests |
| `npm run test:int` | Integration tests (requires `docker compose up -d`) |
| `npm run test:api` | API contract tests |
| `npm run test:e2e` | Playwright journeys |
| `npm run openapi:check` | Regenerates the OpenAPI contract and fails on uncommitted drift |
| `npm run db:migrate` / `db:migrate:down` | Applies / reverts migrations |

`lint`, `lint:arch`, `test`, `test:int`, `test:api`, and `openapi:check` are the always-on gate for every slice. `test:e2e` runs for slices that complete a user-visible journey.

## Fixtures and data

- Deterministic fictional data only; generators live in the shared kernel. Never real patient data (gate in `05-quality/01-security-privacy.md`).
- Every slice touching dates or money reuses the shared Jalali round-trip and rial/toman exactness fixtures (ADR-008, `05-quality/02-test-strategy.md`) — never local copies.
- Mixed-script fixtures (Persian name + Latin name + Persian digits) are mandatory in any list, print, or message test.
