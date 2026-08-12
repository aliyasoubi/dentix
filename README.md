# Dentix — Farsi-First Single-Office Dental PMS

**Dentix** is the product name. This is the docs-as-code implementation baseline.
**The markdown files in `docs/` are the version-controlled source of truth** — see
`docs/document-control.md` for versioning and ownership.

**New here, or just want to know what's actually built?** Read **[`STATUS.md`](STATUS.md)** first —
plain-language, no jargon, answers "what works, what doesn't, and why." This file is about
running the code, not explaining the project.

## Layout

```
STATUS.md                  Plain-language project status — read this first
CLAUDE.md                  AI-assisted development guide (invariants, conventions)
assets/brand/               Dentix logo — icon, EN/FA lockups, monochrome variant
docker-compose.yml         Dev-only Postgres + Keycloak + MinIO
keycloak/                  Realm export (ADR-007) + dev user seed scripts
apps/
  api/                     NestJS modular monolith (ADR-001); also serves the built Angular app (see "Running the app")
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

## Where the project stands

Short version in `STATUS.md`. The precise, itemized version — every checklist item, every ADR's
exact per-item status — lives in `docs/07-plans/release-0.5-walking-skeleton.md` and
`docs/04-architecture/adr/`; those are kept honest rather than flipped to "done" early.

## Getting started

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
docker compose up -d               # Postgres 18 + Keycloak (dev mode) + MinIO
npm run db:migrate --workspace apps/api
```

First-time Keycloak setup (fetch the client secret, seed a dev user) is documented in `keycloak/README.md` — do that once, right after `docker compose up -d`, before trying to log in.

### The canonical verification gate

These are the same commands CI runs, in this order (`docs/08-implementation/01-workflow.md`):

```bash
npm run format      # Prettier check
npm run lint        # ESLint across all workspaces
npm run lint:arch   # module-boundary rules (no framework imports in domain/, entity registration, etc.)
npm run test         # unit tests, all workspaces
npm run openapi:check  # regenerates the OpenAPI contract + Angular client types, fails on drift
npm run db:migrate && npm run db:migrate:down && npm run db:migrate  # migration round-trip
npm run test:int     # integration tests against real Postgres — see the warning below before running this
npm run test:api     # API contract tests against the real Keycloak container
npm run build         # all workspaces
```

> **`npm run test:int` truncates shared dev data.** Several integration specs
> (`identity-access.int-spec.ts`, `patients.int-spec.ts`, `office.int-spec.ts`,
> `outbox.int-spec.ts`) `TRUNCATE ... CASCADE` the `office`, `office_user`,
> `user_account`, and `patient` tables as part of their own cleanup — correct
> for test isolation, but it runs against the **same** Postgres database this
> section just told you to use for interactive dev/testing. Running
> `npm run test:int` will silently delete your dev-bootstrapped login (and
> any patients you created by hand through the UI). If that happens, re-run
> the dev user bootstrap (`keycloak/README.md`, step 2, plus
> `bootstrap-dev-office-user.ts` — see below) rather than wondering why login
> suddenly fails with `NO_ACTIVE_ACCOUNT`. Don't run `test:int` in the middle
> of a manual testing session unless you're prepared to re-seed afterward.

### Running the app locally

The Angular app and the API **must** run combined, on one origin — the BFF
session cookie and CSRF design assume it (`09-authentication-session-
architecture.md`: "Browser API calls use the same origin"). Angular's own
`ng serve` (`:4200`) is not proxied to the API, so it cannot complete login.

```bash
npm run build --workspace apps/web       # Angular build the API will serve statically
npm run start:dev --workspace apps/api   # serves both API and the built Angular app on :3000
```

Open **http://localhost:3000** — not `:4200`. `/health` is unversioned; everything else sits under `/api/v1` (see the generated contract at `apps/api/openapi.json`).

If this is a fresh Postgres/Keycloak pair (or you just ran `test:int` and lost your dev login — see above), link the Keycloak dev user to a Dentix office/account before logging in:

```bash
# <keycloak-user-id> is printed by keycloak/seed-dev-user.sh, or read it
# from the Keycloak admin console (localhost:8080) → Users → dr.dev
npx ts-node -T scripts/bootstrap-dev-office-user.ts <keycloak-user-id>
# (run from apps/api/)
```

Sign in as `dr.dev` / `DevPassword123!` (dev-only, see `keycloak/README.md`); first login prompts for TOTP enrollment.

### Other things you can run

```bash
npm run storybook --workspace apps/web              # design-system components in isolation
npm run render:receipt-fixture --workspace apps/worker  # renders a real Persian PDF receipt to apps/worker/tmp/
```

Version 0.5.0 · Baseline 2026-08-12
