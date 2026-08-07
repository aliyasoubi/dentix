# Release 0.5 — Walking Skeleton, as Testable Slices

Execution breakdown of `07-plans/release-0.5-walking-skeleton.md` using the workflow and template in `01-workflow.md`. Slices run in order; each ends fully verified. Later releases get their own slice file only when they start — slices are written just-in-time so they can't drift from the spec.

### S1 — Repository, CI, and dev environment
Spec:        `07-plans/release-0.5-walking-skeleton.md`; stack table in SDD §2.1; `07-plans/00-build-sequencing.md` for why Redis/MinIO are excluded here
Module:      (platform, no domain module)
Builds:      Monorepo (Angular app + NestJS api/worker + shared kernel package); pinned versions; `docker-compose.yml` with PostgreSQL 18 and Keycloak only; CI running the canonical commands on every PR
Tests first: A trivial kernel unit test and a trivial API test, so `test`/`test:api` are proven wired, not decorative
Verify:      `docker compose up -d` healthy; `npm run lint && npm run test && npm run test:api` green locally and in CI
Human check: No user-visible surface. The human confirms a fresh clone reaches green CI by following the README steps once on their own machine.
Done when:   A fresh clone reaches green CI with documented steps; plan checkboxes "monorepo scaffold" + "docker-compose dev environment" tick

### S2 — Migration baseline and architecture lint (proves ADR-006)
Spec:        `adr/adr-006-persistence-tooling.md`; conventions in `04-data-model.md` (identity/tenancy, audit columns)
Module:      `office-administration` (first owned table: `office`)
Builds:      TypeORM data source with explicit per-module entity registration; first migration creating `office` with the standard audit columns; `lint:arch` rules from ADR-006/`03-module-boundaries.md`
Tests first: Integration — migration up/down; `UNIQUE (office_id, id)` convention holds; unit — a mapper maps ORM record ↔ domain entity with zero framework imports in `domain/` (lint proves it)
Verify:      `npm run db:migrate && npm run db:migrate:down && npm run db:migrate`; `npm run test:int`; `npm run lint:arch`
Human check: No user-visible surface. The human reviews the first migration file and the ADR-006 checklist together before the status flips.
Done when:   ADR-006 acceptance checklist items pass; ADR-006 status flips to Accepted

### S3 — OIDC BFF login and session (proves ADR-007)
Spec:        `09-authentication-session-architecture.md`; `adr/adr-007-oidc-provider.md`; `user_account`/`user_session` tables in `04-data-model.md`
Module:      `identity-access`
Builds:      `/auth/login`, `/auth/callback`, `/auth/logout`, `whoami` query; hashed session persistence; `__Host-dentix_session` cookie; CSRF token issuance; Keycloak realm export in repo
Tests first: Integration — session create/lookup/revoke, hashed identifier, expiry fields; API — cookie attributes, CSRF rejection on unsafe request without token, state/nonce/PKCE failure rejects login, logout revokes
Verify:      `npm run test:int && npm run test:api` (Keycloak from Compose)
Human check: In a real browser: open the app → redirected to Keycloak → log in with MFA → land back authenticated; `whoami` shows the right user; logout ends the session; devtools shows only the `__Host-dentix_session` cookie, no tokens.
Done when:   Human check passes; ADR-007 checklist passes → Accepted

### S4 — First entity end-to-end: minimal patient
Spec:        `02-requirements/01-patient-management.md` (identity, Iranian contact rules, search — minimal subset); `patient`/`patient_name` in `04-data-model.md`
Module:      `patients`
Builds:      Migration for `patient` + `patient_name`; create-patient command (native name required, Latin optional); list/search query with normalized-name matching; audit event on create; Angular page rendering the slice in fa-IR RTL
Tests first: Unit — Persian normalization (Yeh/Kaf variants, Persian/Latin digits) and phone canonicalization; integration — patient persisted with original + normalized values, `(office_id, patient_number)` uniqueness, audit row written in the same transaction; API — create/list contract, endpoint authorization (unauthenticated 401); component — the form accepts Persian input with a Latin-name field
Verify:      Always-on gate + `npm run test:e2e` for: login → create patient (Persian + Latin name) → find via search in three digit/phone forms
Human check: Create a patient with a Persian name and a Latin name; find them by typing the mobile as 09…, +98…, and Persian digits; confirm the page reads correctly RTL and the Latin name doesn't scramble the layout.
Done when:   Human check passes; plan checkbox "one end-to-end slice" ticks — this is the walking skeleton's spine

### S5 — Jalali adapter and date picker (proves ADR-008)
Spec:        `adr/adr-008-jalali-adapter.md`; ADR-005; ADR-012
Module:      shared kernel + design system
Builds:      Calendar-adapter interface; `date-fns-jalali` implementation; custom Material `DateAdapter`; the shared round-trip fixture suite (frozen after one human review)
Tests first: The fixture suite itself — Nowruz/leap-year/Esfand-30/year-boundary round trips, ICU cross-check, digit parsing (see ADR-008)
Verify:      Fixture suite green in backend and frontend CI; `lint:arch` proves adapter-only Jalali imports
Human check: On the S4 page, pick a birth date around Nowruz: the picker shows Jalali, the stored value round-trips, and re-opening the record shows the same Jalali date. Try typing the date in Persian digits.
Done when:   Human check passes; picker binds Jalali display to a canonical Gregorian value; ADR-008 → Accepted

### S6 — Money primitives
Spec:        ADR-005; money conventions in `04-data-model.md` and `05-api-guidelines.md`; UX-DS-001 §2.1 money rules
Module:      shared kernel + design system
Builds:      `Money` type over `bigint` rials; decimal-string API (de)serialization; rial/toman conversion; `DsMoneyDisplay` and money-input components with mandatory unit labels
Tests first: Property tests — toman↔rial exactness, no float path, no silent rounding, label always rendered; API — `amountRial` decimal-string round trip
Verify:      Always-on gate; Storybook renders both components (plan checkbox "Storybook with first Ds components")
Human check: In Storybook, enter ۲٬۵۰۰٬۰۰۰ toman: the component shows the ریال equivalent (۲۵٬۰۰۰٬۰۰۰), the unit label is visible and cannot be hidden, and Latin-digit entry gives the same value.
Done when:   Human check passes; S2's `bigint` proof upgraded to the shared `Money` type everywhere

### S7 — Persian PDF receipt fixture (proves ADR-009)
Spec:        `adr/adr-009-print-pipeline.md`
Module:      `documents` infrastructure + worker
Builds:      Worker render job (Playwright HTML→PDF), embedded Vazirmatn, dummy-receipt template using S5 dates and S6 money, object-storage upload with content hash — this is where MinIO is added to the compose stack, per `07-plans/00-build-sequencing.md` ("add MinIO when document storage starts"), not in S1
Tests first: Integration — render inside the worker container within timeout/memory budget; hash stable across renders; visual baseline committed after one human review
Verify:      `npm run test:int`
Human check: Open the rendered PDF: Persian text is shaped and connected correctly, the Latin name sits correctly inside RTL text, digits/units/Jalali date are right, and Vazirmatn rendered (no fallback font). This review freezes the visual-regression baseline.
Done when:   Human check passes; ADR-009 checklist passes → Accepted

### S8 — OpenAPI contract and typed Angular client
Spec:        `05-api-guidelines.md`
Module:      (platform)
Builds:      OpenAPI generation from Nest; committed contract; generated/type-checked Angular client consumed by the S4 page; `openapi:check` in CI
Tests first: CI drift check itself; client adapter converts `amountRial` string → `bigint` (unit)
Verify:      `npm run openapi:check`; frontend builds against the generated types
Human check: No user-visible surface. The human spot-reads the committed OpenAPI contract once for naming/shape sanity (money as decimal string, dates as ISO).
Done when:   Plan checkbox "OpenAPI generated and consumed" ticks

### S9 — Deploy the skeleton (proves ADR-010)
Spec:        `adr/adr-010-hosting-operations.md`; `06-operations/01-deployment.md`
Module:      (platform)
Builds:      Compose stack on the chosen host over TLS; backup pipeline (WAL archiving + nightly); registry mirror/cache; deploy + smoke-test script
Tests first: Smoke script asserting: login works, S4 patient round-trips, S7 render succeeds, backup job ran
Verify:      Smoke script green on the deployed host; one timed restore into an isolated environment
Human check: From a machine that is not the dev machine, over TLS: log in, create and find a patient, download the S7 PDF. The named operator performs the restore drill by following the runbook, not by being walked through it.
Done when:   Human check passes; ADR-010 checklist passes → Accepted; **Release 0.5 exit criteria review against the plan**

## Exit

All nine slices done ⇒ every Release 0.5 plan checkbox is ticked and ADR-006…010 are Accepted. Only then write `02-slices-release-1.md` and begin R1.
