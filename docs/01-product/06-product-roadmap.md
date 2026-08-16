# Product Roadmap

> **Release naming was corrected on 2026-08-16.** The releases below were named for the
> *architecture* they contain ("Platform foundation", "Front office"), which let horizontal
> infrastructure work look like product progress — a permission system enforcing nothing, an
> outbox with no consumer, patient fields that could not be viewed. Releases are now named for
> the **office outcome** they deliver and must each be independently usable:
>
> | Stage | Outcome |
> |---|---|
> | Foundation Recovery Sprint | Secure, recoverable platform. **Not a product release.** |
> | Release 1 — Patient Book | Replaces the patient spreadsheet or paper index |
> | Release 2 — Appointment Book | Replaces the appointment notebook |
> | Release 3 — Treatment Record | Dentist records a common treatment end to end |
> | Release 4 — Follow-up Centre | No implant/ortho/lab case lacks a next action |
> | Release 5 — Patient Finance | Patient charges, payments, balances (optional) |
>
> The governing test: *if development stopped permanently after this release, could the office
> still deploy and use what was delivered?* A later release may add capability; it must never
> complete fundamentals an earlier one left broken.
>
> **The scope lists below remain the long-term target and do NOT authorize implementation.**
> See the rule in CLAUDE.md ("What authorizes implementation"). Note in particular that the
> basic appointment schedule once folded into Release 1 now belongs to Release 2, so that
> Release 1 can be finished and used as a patient registry on its own.

## Release 0 - Discovery and prototype

  - Observe the office’s real workflows
  - Confirm Persian clinical and administrative terminology
  - Prototype patient header, schedule, odontogram, Follow-up Center, and ledger
  - Agree permission matrix and retention rules
  - Define migration sources and data quality risks

**Exit:** Clickable prototype approved by dentist, receptionist, assistant, and office manager.

## Release 1 - Platform foundation

Scope is deliberately a minimal foundation, not the full architecture — see `../07-plans/00-build-sequencing.md` for what's kept now versus deferred to later releases.

  - Monorepo, CI, environments, database migrations
  - Authentication, MFA, roles, permissions, sessions
  - Design tokens, Material/CDK foundation, Farsi-only RTL shell (ADR-012)
  - Jalali date adapter (Jalali-only presentation, Gregorian/UTC canonical storage), Asia/Tehran business-date rules, and Iranian holiday configuration
  - Rial/toman input and formatting primitives backed by canonical rial values
  - Office, providers, operatories, procedure categories
  - Patient registry, search, alerts, relationships, documents
  - Audit event framework and backups

Exit: Fictional patient data can be managed securely with correct Jalali dates (Gregorian/UTC canonical underneath) and unambiguous rial/toman amounts.

## Release 2 - Front office

  - Calendar views and appointment lifecycle with Jalali presentation
  - Provider availability, blocks, holidays, conflicts
  - Check-in, planned appointments, waitlist, recall
  - Basic transactional reminders and communication history
  - Daily schedule and front-office dashboard

**Exit:** Reception can operate a full fictional day without spreadsheets.

## Release 3 - Clinical core

  - Encounters and history review
  - Findings, diagnoses, clinical note drafts/signing/amendments
  - SVG odontogram and procedure completion
  - Periodontal examination
  - Clinical timeline and basic documents

**Exit:** Dentist can document selected common appointment types safely.

## Release 4 - Treatment continuity

  - Procedure and fee catalog
  - Versioned treatment plans and patient decisions
  - Treatment journeys and templates
  - Follow-up tasks and Follow-up Center
  - Lab orders and schedule readiness indicators
  - Unscheduled accepted-treatment queue

**Exit:** Implant, orthodontic, crown/bridge, and custom workflows have visible next actions.

## Release 5 - Patient finance

  - Charges, payments, discounts, adjustments, refunds, reversals
  - Receipts, statements, balances, daily reconciliation with explicit rial/toman units
  - Production and collections reports

**Exit:** An authorized parallel ledger reconciles exactly with current office records, or fictional reconciliation passes while the Real-Data Authorization Gate remains closed.

## Release 6 - Operational completeness

  - Data import tools and structured exports
  - Fixed report suite
  - Persian print templates and consent acknowledgment
  - Security hardening, penetration testing, restore drills
  - Performance tuning and accessibility audit

**Exit:** Production readiness review passes.

## Release 7 - Controlled clinic pilot

  - Limited users and selected workflows
  - Parallel operation and reconciliation
  - Training, support playbook, issue triage
  - Go/no-go gates and rollback procedure

**Exit:** Office approves phased production adoption.
