# Dentix — Software Design Document

Standard architecture reference for building Dentix, structured on the [arc42](https://arc42.org) template. This is the single entry point a developer opens to understand the system and the order to build it in.

**This document synthesizes and cross-references the detailed spec — it does not replace it.** Where a claim here and a detailed file in `docs/` ever disagree, the detailed file wins (per `CLAUDE.md`); file an issue and correct this document in the same PR. Section headers link to the files that carry the full detail.

---

## 1. Introduction and Goals

### 1.1 Product summary

Dentix is a custom dental practice management system for one Iranian dental office: Farsi-only (fa-IR), RTL UI, Jalali-only date presentation (ADR-012), rial/toman money, and Gregorian/UTC + integer-rial canonical storage. It covers patient registry, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, lab orders, recall, patient ledger, documents, communications, and fixed reports.
Full detail: `01-product/01-readme.md`, `01-product/02-product-vision.md`.

### 1.2 Explicitly out of scope

Insurance/claims, general accounting, payroll, e-prescribing, native imaging drivers, card vaulting, AI diagnosis, marketing automation, native mobile apps, multi-location billing, custom report builder. A feature only enters scope if it (1) supports a defined single-office workflow, (2) does not reintroduce an excluded domain indirectly, and (3) has acceptance criteria, an owner, and a measurable outcome.
Full detail: `01-product/03-scope-and-exclusions.md`.

### 1.3 Quality goals (ranked)

1. **Correctness of money and dates** — bigint rial storage, exact toman conversion, Gregorian/UTC canonical with Jalali presentation; zero silent rounding, zero float arithmetic on money.
2. **Auditability** — signed clinical records and posted ledger entries are immutable; every correction is a new event (amendment/reversal), never an in-place edit.
3. **Usability for one office's real workflow** — fast enough for daily front-office and clinical use; RTL-first, not RTL-retrofitted.
4. **Security of patient data** — OIDC+MFA, endpoint and object-level authorization, encryption at rest/in transit, full audit trail.
5. **Maintainability by a small team** — modular monolith over microservices, strict module boundaries, explicit mappers, CI-enforced architecture rules.

### 1.4 Stakeholders

| Role | Concern |
|---|---|
| Dentist / providers | Clinical safety, charting speed, signed-record integrity |
| Reception / office manager | Scheduling throughput, ledger accuracy, day-end reconciliation |
| Patients | Correct appointments/receipts in Persian, data privacy |
| Developer(s) implementing this system | An unambiguous, buildable spec — this document |

---

## 2. Constraints

### 2.1 Technical constraints (fixed, not up for reinterpretation)

| Layer | Choice |
|---|---|
| Frontend | Angular 22 + Angular Material/CDK + custom dental design system. No PrimeNG/NG-ZORRO mixing. |
| Backend | NestJS on Node.js 24 LTS — modular monolith, not microservices (ADR-001) |
| Database | PostgreSQL 18 |
| Jobs/cache | Redis + BullMQ |
| Object storage | S3-compatible, encrypted |
| API | REST + OpenAPI at `/api/v1`; Angular client generated/type-checked from the contract |
| Auth | OIDC + MFA (provider per ADR-007, still Proposed) |

Pin exact dependency versions; update through review only. Full detail: `CLAUDE.md`, `04-architecture/01-system-architecture.md`.

### 2.2 Organizational / regulatory constraints

- One domestic Iranian office; foreign SaaS dependencies (IdPs, cloud, SMS) may be unreliable or restricted — hosting (ADR-010) and provider choices (ADR-007, ADR-011) must assume this.
- No legal sign-off on data jurisdiction exists yet — tracked as risk R-13, hard gate before Release 7 (real patient data).
- All code — identifiers, schema, API fields, config keys, error codes, logs, comments — is English. Farsi exists only in `i18n/fa-IR/*.json` and DB translation rows.

### 2.3 Open decisions that block implementation in their area

ADR-006 (persistence/ORM), ADR-007 (OIDC provider), ADR-008 (Jalali library), ADR-009 (print pipeline), ADR-010 (hosting) are **Proposed**, not Accepted. Do not build the affected area until each is accepted — see §9 and Release 0.5 in §11.

---

## 3. Context and Scope

### 3.1 Business context

```
                    ┌─────────────────────────┐
   Reception/        │                         │
   Dentist/  ───────►│         Dentix          │◄─────── Patients (via
   Office manager     │   (single-office PMS)   │          printed docs,
                    │                         │          SMS/email only —
                    └───────┬────────┬────────┘          no patient portal)
                            │        │
                  ┌─────────┘        └─────────┐
                  ▼                             ▼
          OIDC Identity Provider        SMS / Email Provider
          (self-hosted, ADR-007)        (domestic Iranian, ADR-011)
```

No patient-facing portal or app exists in v1; all patient interaction is in-person, by phone, or via one-way SMS/email/printed documents.

### 3.2 Technical context

External systems: OIDC identity provider (auth), SMS/email provider (reminders, via queued worker jobs), S3-compatible object storage (documents, generated PDFs). No insurance clearinghouse, no payment gateway, no imaging-device integration — all explicitly excluded.

---

## 4. Solution Strategy

| Decision | Why | ADR |
|---|---|---|
| Modular monolith, one Postgres DB, transactional outbox | Strong transactional consistency across scheduling/clinical/finance; simpler ops for one office; microservices buy nothing here | ADR-001 |
| Angular Material/CDK as the only UI foundation | Accessibility/bidi/overlay primitives come for free; avoids conflicting component suites | ADR-002 |
| Farsi-only, RTL-only, Jalali-only presentation in v1 | Halves the UI test matrix (no runtime language/direction switching); office only needs Persian | ADR-012 (supersedes ADR-003) |
| Gregorian/UTC + integer-rial canonical storage, always | Keeps the data layer boring and internationalization-ready even though the UI is Farsi-only | ADR-005, ADR-012 |
| Immutable signed clinical records / posted ledger entries | Auditability and reproducibility; corrections are new events, not edits | ADR-004 |
| Domain → Application → Infrastructure → Presentation layering, explicit mappers, no ORM leakage | Keeps business rules independent of NestJS/ORM/HTTP; testable in isolation | `04-architecture/03-module-boundaries.md` |

---

## 5. Building Block View

### 5.1 Module list (level 1)

Identity and access · Office administration · Patients · Scheduling · Clinical encounters · Odontogram and periodontal charting · Procedure catalog · Treatment planning · Treatment journeys · Follow-up and recall · Lab orders · Patient ledger · Documents · Communications · Reporting · Audit · Integrations

Each module owns its bounded context (see `04-architecture/02-domain-model.md` for the nine contexts: Patient Registry, Scheduling, Clinical, Treatment Planning, Treatment Continuity, Laboratory, Patient Finance, Documents and Communications, Audit). Modules call each other only through application ports and domain events — never through another module's repository.

### 5.2 Internal module layout (level 2 — use this for every module)

```
module/
  domain/
    entities/
    value-objects/
    services/
    events/
    repositories/
  application/
    commands/
    queries/
    use-cases/
    dto/
    ports/
  infrastructure/
    persistence/
    messaging/
    external/
    mappers/
  presentation/
    http/
    websocket/
```

Dependency direction is one-way: `domain` imports nothing framework-specific → `application` imports `domain` and defines ports → `infrastructure` implements those ports → `presentation` translates transport input into commands/queries. Full detail and code-quality rules: `04-architecture/03-module-boundaries.md`.

### 5.3 Data model (level 3)

Table groups: Identity and office, Patient, Scheduling, Clinical, Treatment continuity, Finance, Documents and platform. Common columns on business tables: UUID primary key, `office_id`, `created_at`/`created_by`, `updated_at`/`updated_by` (mutable records), `version` (optimistic concurrency), optional `archived_at`. Signed clinical and posted financial records use append-only/version tables instead of ordinary updates.
Full detail (complete table list, indexing priorities, concurrency rules): `04-architecture/04-data-model.md`.

---

## 6. Runtime View

### 6.1 System topology

```mermaid
flowchart LR
    U[Browser - Angular] -->|HTTPS REST/OpenAPI| API[NestJS API]
    API --> DB[(PostgreSQL)]
    API --> OBJ[Encrypted Object Storage]
    API --> REDIS[(Redis)]
    REDIS --> WORKER[Background Worker]
    WORKER --> SMS[SMS Provider]
    WORKER --> EMAIL[Email Provider]
    IDP[OIDC Identity Provider] --> U
    IDP --> API
    API --> OBS[Logs, Metrics, Traces]
```

### 6.2 Use-case execution pattern (every write path follows this)

1. Controller extracts auth context, validates input, dispatches a command/query — no business logic in controllers.
2. Use case loads required aggregates through repositories.
3. Use case performs authorization with object context (endpoint checks alone are never sufficient).
4. Use case invokes domain behavior.
5. Use case commits one transaction.
6. Use case writes outbox/audit events in the same transaction.
7. Use case returns a transport-independent result; presentation maps it to the HTTP response.

### 6.3 Example event reaction

`ProcedureCompleted` may update a linked treatment-plan item, advance a treatment journey, and create a draft charge — each reaction is idempotent and auditable, processed by workers off the transactional outbox, not inline in the triggering request.
Full detail: `04-architecture/02-domain-model.md` (domain event list), `04-architecture/01-system-architecture.md`.

---

## 7. Deployment View

### 7.1 Deployable units

`web` (Angular static bundle) · `api` (NestJS modular monolith) · `worker` (same codebase or separate process for queued jobs) · PostgreSQL · Redis · Object storage · Reverse proxy / ingress.

### 7.2 Environments

Local development → shared development/integration → staging (fictional or approved-anonymized data only) → production. Production and non-production use fully separate accounts, secrets, databases, object stores, and identity clients.

### 7.3 Deployment sequence

1. Validate configuration and secrets.
2. Take/verify a recent recoverable backup before risky database changes.
3. Apply backward-compatible (expand-and-contract) migration.
4. Deploy API/worker.
5. Deploy web bundle.
6. Run smoke tests.
7. Monitor errors, latency, jobs, database health.
8. Complete post-deploy verification.

Rollback requires schema to remain backward compatible; irreversible migrations need an approved corrective-migration plan before deployment. **Where this actually runs is not yet decided — ADR-010 (hosting model) is Proposed and blocks any real deployment.**
Full detail: `06-operations/01-deployment.md`, `06-operations/02-backup-recovery.md`, `06-operations/03-monitoring.md`.

---

## 8. Crosscutting Concepts

### 8.1 Money

Canonical unit is the Iranian rial, stored as signed bigint (`amount_rial`), plus a `currency CHAR(3) NOT NULL DEFAULT 'IRR'` hedge column on every money field. Toman is display/input only: 1 toman = exactly 10 rials, converted at the application boundary, never with JS floats. Every displayed amount carries an explicit rial/toman label; conversions never silently round. ADR-005.

### 8.2 Dates and calendar

UTC instants and Gregorian ISO dates are canonical everywhere in the DB and API. The UI presents and accepts **Jalali only** (ADR-012) through one calendar-adapter interface — Gregorian display is a removed toggle in v1, not a deleted capability, so adding it back later is a new adapter, not a rewrite. Office timezone is explicit `Asia/Tehran` (IANA), never inferred from the browser. Jalali strings are never persisted as domain dates. ADR-005, ADR-008 (adapter library, still Proposed), ADR-012.

### 8.3 Language, RTL, and future i18n hedge

v1 ships Farsi-only, RTL-only, with no runtime language/direction switch (ADR-012, supersedes ADR-003). Despite that, every UI string lives in externalized translation resources (never hardcoded Persian in components), CSS uses logical properties (never hardcoded left/right), backend returns locale-neutral error codes, and the calendar/currency stay behind adapters — because the product's stated future direction is possible internationalization, and these hedges are what keep that a bounded change instead of a rewrite. Chronology, dental anatomy, and tooth orientation never mirror in RTL. The Latin patient-name field is retained; dynamic Latin names/codes/phones inside Persian text use Unicode bidi isolation.
Full detail: `03-ux/03-bilingual-rtl-guidelines.md`, `04-architecture/06-configuration-catalog.md`, ADR-012.

### 8.4 Immutability

Signed clinical records and posted ledger entries are never updated or deleted. Clinical corrections are amendments; financial corrections are reversals plus new entries. Draft records remain normally versioned/concurrency-controlled until signed or posted. ADR-004.

### 8.5 Configuration layers

| Layer | Where | Example |
|---|---|---|
| 1. Deployment | env/secret manager, never in DB or sent to frontend | DB connection, OIDC client secret |
| 2. Office | DB, admin UI, every change audited | locale, calendar display, procedure fees |
| 3. User preference | per user, low-risk | default calendar view, density |
| 4. Frontend bootstrap | public JSON, fetched pre-render, no secrets ever | locale, dir, timezone, API base URL |

Deliberately **not** configuration (changing these means changing code + a replacement ADR): canonical storage rules, domain state machines, immutability rules, the 1 toman = 10 rial ratio.
Full detail: `04-architecture/06-configuration-catalog.md`.

### 8.6 Authorization and state transitions

Every mutation requires both endpoint-level and object-level authorization checks. Signing, exports, and refunds require recent authentication. Sensitive actions produce audit events. State changes go through explicit transition/action endpoints (`POST .../transitions`, `.../sign`, `.../reversals`) — never a generic `PATCH` for signed notes, appointment lifecycle, lab readiness, journey stages, or ledger corrections.
Full detail: `01-product/04-roles-and-permissions.md`, `05-quality/01-security-privacy.md`, `04-architecture/05-api-guidelines.md`.

---

## 9. Architecture Decisions

| ADR | Decision | Status |
|---|---|---|
| 001 | Modular monolith, not microservices | Accepted |
| 002 | Angular Material/CDK as sole UI foundation | Accepted |
| 003 | Runtime Persian/English localization | **Superseded by ADR-012** |
| 004 | Immutable signed clinical / posted financial records | Accepted |
| 005 | Iranian calendar (Jalali/Gregorian) and rial/toman representation | Accepted |
| 006 | Persistence and migration tooling (ORM choice) | **Proposed — accept during Release 0.5** |
| 007 | OIDC identity provider | **Proposed — accept during Release 0.5** |
| 008 | Jalali calendar library / Angular DateAdapter | **Proposed — accept during Release 0.5, needs round-trip proof** |
| 009 | PDF/print pipeline | **Proposed — accept during Release 0.5, needs dummy-receipt proof** |
| 010 | Hosting and operations model | **Proposed — blocking gate before any deployment** |
| 011 | SMS/email provider | **Proposed — accept during Release 2 planning** |
| 012 | Farsi-only UI, Jalali-only presentation | Accepted — supersedes ADR-003, amends ADR-005's presentation clauses |

A decision that contradicts an Accepted ADR requires a replacement ADR — do not code around it. Full ADR text: `04-architecture/adr/`.

---

## 10. Quality Requirements

### 10.1 Mandatory test categories (every feature touching dates or money)

- Jalali↔Gregorian round-trip tests (leap years, Nowruz, Esfand 29/30, year boundaries).
- Rial/toman exactness property tests (reversals return the prior balance, conversions never silently round).
- Latin-name/mixed-script fixtures in list, print, and message tests (bidi isolation).

### 10.2 Test pyramid summary

Unit (domain transitions, money/date conversion, normalization, permission decisions) → Integration (repositories, Postgres constraints, outbox, OIDC, Redis jobs) → API contract (OpenAPI compatibility, authorization matrix, idempotency) → Component (Angular forms, custom schedule/odontogram/ledger controls) → End-to-end (critical Persian-language user journeys: register/search patient, schedule lifecycle, chart and sign an encounter, treatment plan → journey → lab order, procedure completion → charge → payment, print receipt).
Full detail: `05-quality/02-test-strategy.md`, `05-quality/03-acceptance-criteria.md`, `05-quality/04-definition-of-done.md`.

### 10.3 Security baseline

OIDC/OAuth2 + MFA for all patient-accessing users, least-privilege endpoint+object authorization, recent-auth requirement for signing/export/high-risk finance actions, TLS everywhere, encryption at rest, no PHI in logs/URLs/commits, OWASP ASVS as the verification framework.
Full detail: `05-quality/01-security-privacy.md`.

---

## 11. Risks and Technical Debt

### 11.1 Highest-severity open risks (High likelihood × High impact, or vice versa)

| ID | Risk | Mitigation |
|---|---|---|
| R-03 | Sanctions/network restrictions block npm, Docker Hub, cloud, or foreign SaaS from Iran | Decide hosting early (ADR-010); prefer self-hostable OSS; local registry mirror |
| R-05 | Data migration quality: legacy spreadsheets/paper produce duplicates and wrong balances | R0 source inventory; migration spec (`02-requirements/09-data-migration.md`); rehearsal + reconciliation before pilot |
| R-06 | Immutability design flaw only found after real data exists | Property-based tests in R5; parallel run before cutover |
| R-07 | Key-person dependency on a small team | Docs-as-code (this repo); ADR for every decision; runbooks in R6 |
| R-11 | Pilot fatigue running two systems in parallel | Short scoped parallel window; visible reception wins first |
| R-13 | No named legal jurisdiction review for patient data | Hard entry gate before Release 7 |

Full register (16 risks, owners, triggers): `07-plans/risks.md`. Reviewed at every release boundary.

### 11.2 Known specification gaps (from the design review)

No stable requirement IDs yet (recommend PAT-001, SCH-001… assigned in R0); Iranian holiday data source/ownership undefined; offline/degraded-mode behavior only partially specified; no named package owner or approvers yet in `document-control.md`.
Full detail: `00-review/design-review-gap-analysis.md`.

---

## 12. How to Build This — Implementation Order

Do not start a release before the previous release's exit gate is signed off. Each release plan under `07-plans/` states its goal, in-scope spec sections, task checklist, and exit criteria.

| # | Release | What gets built | Exit gate |
|---|---|---|---|
| 0 | Discovery | Prototype (patient header, schedule, odontogram, Follow-up Center, ledger); confirm terminology and permission matrix; inventory migration sources | Clickable prototype approved by office staff |
| 0.5 | **Walking skeleton** | Accept ADR-006/007/008/009 with working proofs: Jalali round-trip fixtures, a dummy bilingual-safe receipt through the chosen print pipeline, OIDC+MFA login, one real persisted+mapped entity end to end | Risk stack proven end-to-end — **do not skip this** |
| 1 | Foundation | Monorepo/CI/migrations, auth+roles+permissions, design tokens + Farsi RTL shell, Jalali date adapter, rial/toman primitives, patient registry, audit framework | Fictional patients managed securely with correct Jalali dates and rial/toman amounts |
| 2 | Front office | Calendar/appointment lifecycle, availability/blocks/holidays, check-in/waitlist/recall, basic reminders | Reception runs a full fictional day without spreadsheets |
| 3 | Clinical core | Encounters, findings/diagnoses, note draft/sign/amend, SVG odontogram, perio exam | Dentist documents common appointment types safely |
| 4 | Treatment continuity | Procedure/fee catalog, versioned treatment plans, treatment journeys, follow-up tasks, lab orders | Long-running care has visible next actions |
| 5 | Patient finance | Charges/payments/discounts/refunds/reversals, receipts/statements, day-end reconciliation | Parallel ledger pilot reconciles exactly |
| 6 | Operational completeness | Import/export tools, fixed report suite, print templates, security hardening, restore drills, accessibility audit | Production readiness review passes |
| 7 | Pilot | Limited-user parallel operation, training, go/no-go gates | Office approves phased production adoption |

**First concrete steps for a developer starting today:**
1. Read `00-review/design-review-gap-analysis.md` for open decisions and gaps in priority order.
2. Accept ADR-010 (hosting) — it shapes everything operational and gates deployment.
3. Run Release 0 discovery, including the migration source inventory and NFR confirmation.
4. Build the Release 0.5 walking skeleton and accept ADR-006/007/008/009 with proofs — this is the highest-leverage risk reduction in the whole roadmap.
5. Only then start Release 1 feature work against §5–§8 of this document.

---

## 13. Glossary

| Term | Definition |
|---|---|
| Appointment | Reserved time for a patient, provider, and operatory |
| Encounter | The clinical visit record for what occurred during one visit |
| Finding | An observed clinical condition, optionally linked to a tooth, surface, arch, or region |
| Procedure | A clinical service proposed, scheduled, in progress, or completed |
| Treatment plan | A versioned proposal containing procedures, phases, fees, and patient decisions |
| Treatment journey | A longitudinal container for multi-visit care with stages, tasks, appointments, procedures, documents, and lab orders |
| Journey stage | The current treatment milestone, such as Healing or Active Treatment |
| Follow-up task | A dated action assigned to a staff member, optionally linked to a patient, journey, appointment, lab order, or encounter |
| Lab order | Work sent to an external dental laboratory, tracked until delivery or revision |
| Recall | A recurring clinical follow-up due after a configured interval |
| Planned appointment | A recommended next visit that has not necessarily been booked |
| Unscheduled treatment | Accepted or clinically ready treatment with no future appointment |
| Patient ledger | The immutable subledger of patient charges, payments, discounts, adjustments, refunds, and reversals |
| Draft clinical record | Editable clinical content not yet signed |
| Signed clinical record | Finalized content that cannot be overwritten; correction requires an amendment |
| Office business date | The date used for day-end reporting in the office timezone |
| Native name | The patient or user name in the person's original script, commonly Persian |
| Latin name | An explicitly supplied Latin-script name; not an automatic transliteration |

Full glossary: `01-product/07-glossary.md`.

---

*Version 0.2.0 · Baseline 2026-08-02 · This document added 2026-08-05, synthesized from the files listed under each section.*
