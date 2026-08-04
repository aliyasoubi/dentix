# CLAUDE.md — Dentix (Bilingual Single-Office Dental PMS)

Guidance for AI-assisted development in this repository. The authoritative spec lives in `docs/` — when in doubt, the spec wins; when the spec is wrong, change the spec in the same PR.

## What this is

**Dentix** is a custom dental practice management system for one Iranian dental office. **Farsi-only (fa-IR) RTL UI with Jalali-only date presentation (ADR-012)**; Gregorian/UTC canonical storage; rial/toman money. Covers patients, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, lab orders, recall, patient ledger, documents, communications, fixed reports.

**Explicitly excluded (never implement, even if asked casually):** insurance/claims, general accounting, payroll, e-prescribing, native imaging drivers, card vaulting, AI diagnosis, marketing automation, native mobile apps, multi-location billing, custom report builder. See `docs/01-product/03-scope-and-exclusions.md`.

## Stack

- Frontend: Angular 22 + Angular Material/CDK, custom dental design system on top. No PrimeNG/NG-ZORRO mixing.
- Backend: NestJS on Node.js 24 LTS — modular monolith (NOT microservices, per ADR-001).
- Database: PostgreSQL 18. Redis + BullMQ for background jobs. S3-compatible encrypted object storage.
- API: REST + OpenAPI at `/api/v1`; Angular client generated/type-checked from the contract.
- Auth: OIDC + MFA (provider per ADR-007).
- Pin exact dependency versions; update through review only.

## Non-negotiable invariants

1. **Money:** canonical unit is the Iranian rial, stored as signed bigint (`amount_rial`). Toman is display-only: 1 toman = exactly 10 rials, converted at the application boundary. Never use JS floats for money. Every displayed amount carries an explicit rial/toman label. Never silently round.
2. **Dates:** UTC instants and Gregorian ISO dates are canonical in DB and API (RFC 3339). The UI presents and accepts Jalali only (ADR-012), converted at the boundary. Office timezone is explicit `Asia/Tehran`, never inferred from the browser. Never persist Jalali strings as domain dates.
3. **Immutability:** signed clinical records and posted ledger entries are never updated or deleted. Clinical corrections = amendments; financial corrections = reversals + new entries (ADR-004).
4. **RTL:** the UI is RTL-only, but still use CSS logical properties, never hard-coded left/right (ADR-012 hedge). Chronology, dental anatomy, and tooth orientation do NOT mirror in RTL. Wrap dynamic Latin names/codes/phones in bidi isolation — the Latin patient-name field is retained.
5. **i18n hedge (ADR-012):** UI is fa-IR only, but no hardcoded UI strings in components — all strings live in externalized translation resources; backend returns locale-neutral error codes. **All code is English**: identifiers, schema, API fields, config keys, error codes, logs, comments. Farsi exists only in `i18n/fa-IR/*.json` and DB translation rows (see docs/04-architecture/06-configuration-catalog.md).
6. **Normalization is for search, never display:** retain original entered text (names, phones, digits); store canonical normalized values alongside for search/dedup.
7. **Authorization:** endpoint AND object-level checks on every mutation. Signing, exports, refunds require recent authentication. All sensitive actions produce audit events.
8. **State changes** go through explicit transition/action endpoints (`POST .../transitions`, `.../sign`, `.../reversals`), not generic PATCH.

## Architecture rules (enforced — see docs/04-architecture/03-module-boundaries.md)

- Module layout: `domain/` (no NestJS/ORM/vendor imports) → `application/` (use cases, ports) → `infrastructure/` (port implementations) → `presentation/` (controllers).
- Modules communicate via application ports and domain events (transactional outbox), never each other's repositories.
- ORM records never leak into domain entities or API responses — explicit mappers.
- One use case = one transaction + outbox/audit writes.
- Strict TypeScript, no `any` outside audited adapters, exhaustive state handling, stable error codes (backend returns codes, UI owns localized wording).

## Working conventions for AI agents

- Before implementing a feature, read the relevant `docs/02-requirements/*.md` section and the current release plan in `docs/07-plans/`.
- A decision that contradicts an accepted ADR requires a replacement ADR — do not code around it.
- ADR-006…011 are Proposed: resolve them before building on the affected area.
- Every feature ships in Persian only (ADR-012), but Jalali↔Gregorian round-trip tests and rial/toman exactness tests are required wherever dates or money appear. Include Latin-name/mixed-script fixtures in list, print, and message tests.
- Definition of Done: `docs/05-quality/04-definition-of-done.md`. Requirements use MUST/SHOULD/MAY per RFC 2119.
- Test data is always fictional; never real patient data in dev/test.
- No PHI or secrets in logs, URLs, commits, or error messages.

## Key documents

| Need | Read |
|---|---|
| Scope question | docs/01-product/03-scope-and-exclusions.md |
| Domain term | docs/01-product/07-glossary.md |
| Permissions | docs/01-product/04-roles-and-permissions.md |
| i18n/RTL/dates/money rules | docs/03-ux/03-bilingual-rtl-guidelines.md + ADR-005 + ADR-012 |
| UI components, tokens, layout | docs/03-ux/05-ui-design-system.md (UX-DS-001 — authoritative for UI) |
| Brand name and logo | docs/03-ux/06-brand-identity.md + assets/brand/ |
| Table/column conventions | docs/04-architecture/04-data-model.md |
| What is config vs invariant | docs/04-architecture/06-configuration-catalog.md |
| API conventions | docs/04-architecture/05-api-guidelines.md |
| Current work | docs/07-plans/README.md |
| Known gaps & open decisions | docs/00-review/design-review-gap-analysis.md |
| Risks | docs/07-plans/risks.md |
