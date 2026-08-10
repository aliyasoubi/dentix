# Dentix — Farsi-First Single-Office Dental PMS

**Dentix** is the product name. This is the docs-as-code implementation baseline.
**The markdown files in `docs/` are the version-controlled source of truth** — see
`docs/document-control.md` for versioning and ownership.

## Layout

```
CLAUDE.md                  AI-assisted development guide (invariants, conventions)
assets/brand/               Dentix logo — icon, EN/FA lockups, monochrome variant
docker-compose.yml         Dev-only Postgres + Keycloak + MinIO (see 00-build-sequencing.md for what's deliberately not here yet)
apps/
  api/                     NestJS modular monolith (ADR-001)
  web/                     Angular 22 + Material/CDK, Farsi-only RTL shell (ADR-012)
  worker/                  Headless-Chromium document rendering (ADR-009)
packages/
  kernel/                  Shared kernel: identifiers, result/error types, Jalali, money (03-module-boundaries.md)
docs/
  README.md                Executive implementation summary
  document-control.md      Authority, ownership, and change rules
  open-decisions.md        Unresolved decisions and discovery gates only
  01-product/              Vision, scope, roles, traceability, roadmap, glossary, references
  02-requirements/         Functional requirements by domain (+ migration, NFR)
  03-ux/                   Information architecture, Farsi/RTL design, motion/a11y, brand identity
  04-architecture/         00-software-design-document.md  ← start here (standard build reference)
                           System, contexts, transactions/events, data, event catalog, sessions, configuration
    adr/                     Architecture decision records
  05-quality/              Security, test strategy, acceptance criteria, definition of done
  06-operations/           Deployment, backup/recovery, monitoring, release process, checklist
  07-plans/                00-build-sequencing.md (now vs. later), execution plans per release (R0 … R7 + added R0.5), risk register
  08-implementation/       AI execution layer: slice workflow, test layers, per-release testable slices
```

## How to use this package

1. Read `docs/04-architecture/00-software-design-document.md` — the standard entry point: architecture, decisions, and the build order in one file.
2. Read `docs/document-control.md` — authority, ownership, and change rules.
3. Follow `docs/07-plans/README.md` — one plan per release, each with tasks and exit criteria — and execute each release as the testable slices in `docs/08-implementation/`.
4. Put this directory at the root of the product git repository so spec changes ride in the same PRs as code.
5. Decisions that contradict an accepted ADR require a replacement ADR.

## Getting started (Release 0.5, slice S1)

Prerequisites: Node 22.23.2 (`nvm use`, matching `.nvmrc`) and Docker.

> **Do not bump Node to 24 without re-verifying `apps/web`.** Node 24.18.1 aborts
> `npm run test --workspace @dentix/web` with `SIGABRT` (exit 134) after ~1,486
> `File descriptor … unmanaged mode` warnings. The Angular build and test
> discovery both succeed; only test _execution_ dies, and it does so regardless
> of Vitest's `pool` setting. `apps/api`, `apps/worker`, and `packages/kernel`
> all pass on 24. Node 22.22.3+ is inside Angular 22's supported range
> (`^22.22.3 || ^24.15.0 || >=26.0.0`) and is LTS into 2027, so the pin costs
> nothing today. Revisit when Angular/Vitest fix the Node 24 path, or at Node 26.

```bash
npm install                        # installs all workspaces (apps/*, packages/*)
cp .env.example .env               # dev-only credentials, see the file for why the Postgres port is 5433
docker compose up -d               # Postgres 18 + Keycloak (dev mode) — nothing else yet, see 00-build-sequencing.md
npm run lint && npm run test && npm run test:api   # S1's verification gate
docker compose down                # when done
```

`npm run start:dev --workspace apps/api` serves the API on `:3000` (`/health` is unversioned; everything else sits under `/api/v1`). `npm run start --workspace apps/web` serves the Angular shell on `:4200`. Neither has real product behavior yet — S1 only proves the pipeline; the first real feature is S4.

**S1 human check:** a person clones the repository fresh and reaches green CI (the four commands above, in order) using only this section — no undocumented steps.

Version 0.5.0 · Baseline 2026-08-06
