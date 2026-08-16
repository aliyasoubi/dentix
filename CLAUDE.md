# CLAUDE.md — Dentix (Farsi-First Single-Office Dental PMS)

Guidance for AI-assisted development in this repository. Document authority and conflict resolution follow `docs/document-control.md`; correct conflicting active documents in the same change.

## What this is

**Dentix** is a custom dental practice management system for one Iranian dental office. **Farsi-only (fa-IR) RTL UI with Jalali-only date presentation (ADR-012)**; Gregorian/UTC canonical storage; rial/toman money. Covers patients, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, lab orders, recall, patient ledger, documents, communications, fixed reports.

**Explicitly excluded in v1 (do not implement, even if asked casually):** inventory/stock management (deferred — an existing standalone system covers it; see the deferred list in `docs/01-product/03-scope-and-exclusions.md`), insurance/claims, general accounting, payroll, e-prescribing, native imaging drivers, card vaulting, AI diagnosis, marketing automation, native mobile apps, multi-location billing, custom report builder. See `docs/01-product/03-scope-and-exclusions.md`.

## Stack

- Frontend: Angular 22 + Angular Material/CDK, custom dental design system on top. No PrimeNG/NG-ZORRO mixing.
- Backend: NestJS 11 on **Node.js 22** (`.nvmrc` 22.23.2, `engines: >=22.22.3 <23`, and the API Dockerfile's `NODE_VERSION` are the sources of truth — this file previously said 24, which was never what shipped).
- Database: PostgreSQL 18.
- **Deferred, not built — do not import or design around these:** Redis + BullMQ (no dependency in any package.json, absent from production Compose) and S3-compatible object storage (MinIO exists in the dev/CI Compose only). The `outbox` module's schema exists but has no producer or consumer; see `docs/07-plans/00-build-sequencing.md` before building on any of it.
- API: REST + OpenAPI at `/api/v1`; Angular client generated/type-checked from the contract.
- Auth: OIDC + MFA with the server-side BFF session in `docs/04-architecture/09-authentication-session-architecture.md`; provider per ADR-007.
- Pin exact dependency versions; update through review only.

## Non-negotiable invariants

1. **Money:** canonical unit is the Iranian rial, stored as signed bigint (`amount_rial`). Toman is display-only: 1 toman = exactly 10 rials, converted at the application boundary. Never use JS floats for money. Every displayed amount carries an explicit rial/toman label. Never silently round.
2. **Dates:** UTC instants and Gregorian ISO dates are canonical in DB and API (RFC 3339). The UI presents and accepts Jalali only (ADR-012), converted at the boundary. Office timezone is explicit `Asia/Tehran`, never inferred from the browser. Never persist Jalali strings as domain dates.
3. **Immutability:** signed clinical records and posted ledger entries are never updated or deleted. Clinical corrections = amendments; financial corrections = reversals + new entries (ADR-004).
4. **RTL:** the UI is RTL-only, but still use CSS logical properties, never hard-coded left/right (ADR-012 hedge). Chronology, dental anatomy, and tooth orientation do NOT mirror in RTL. Wrap dynamic Latin names/codes/phones in bidi isolation — the Latin patient-name field is retained.
5. **Localization boundary (ADR-012):** UI is fa-IR only, but no hardcoded UI strings in components—product-authored UI prose lives in translation resources and backend errors use locale-neutral codes. **All code is English**: identifiers, schema, API fields, config keys, error codes, logs, and comments. Configurable business labels use DB translation rows. Patient names and clinical/user-entered text are stored exactly as entered and may be Farsi.
6. **Normalization is for search, never display:** retain original entered text (names, phones, digits); store canonical normalized values alongside for search/dedup.
7. **Authorization:** endpoint AND object-level checks on every mutation. Signing, exports, refunds require recent authentication. All sensitive actions produce audit events.
8. **State changes** go through explicit transition/action endpoints (`POST .../transitions`, `.../sign`, `.../reversals`), not generic PATCH.

## Architecture rules (enforced — see docs/04-architecture/03-module-boundaries.md)

- Module layout: `domain/` (no NestJS/ORM/vendor imports) → `application/` (use cases, ports) → `infrastructure/` (port implementations) → `presentation/` (controllers).
- Module ownership/dependencies follow `docs/04-architecture/07-context-module-map.md`.
- Cross-module behavior follows `docs/04-architecture/08-transaction-event-semantics.md`; never import another module's repository.
- ORM records never leak into domain entities or API responses — explicit mappers.
- One use case = one transaction + outbox/audit writes.
- Strict TypeScript, no `any` outside audited adapters, exhaustive state handling, stable error codes (backend returns codes, UI owns localized wording).

## What authorizes implementation (read before picking up work)

**Target architecture documents describe long-term boundaries, not the current implementation
queue. Implement only work explicitly included in the active release contract. Every release
must deliver a deployable, end-to-end office workflow that remains useful if no later release is
built.**

This rule exists because ignoring it already happened. `docs/04-architecture/*` and the release
checklists were read as a work queue, which produced: a permission system with time-bound
grant/deny exceptions while `PermissionGuard` was applied to zero routes; ~44 permission codes
for modules that do not exist; an outbox with no producer or consumer; and patient fields that
could be entered but never viewed or edited. All of it satisfied a document. None of it made an
office workflow usable.

Concretely:

- An unchecked box in a plan, an ADR, or a data-model table **is not a work order**. The active
  release contract is (`docs/07-plans/README.md` → the current release plan).
- **A field is not done until it can be entered, validated, stored, displayed, edited,
  authorized and tested.** Ship the whole vertical or do not start it.
- **New infrastructure needs a consumer in the current release.** "Needed later" is not a
  reason. This applies especially to queues, events, workers, object storage, caching, generic
  engines, permission abstractions and design-system wrappers.
- **Generalise only after repetition** — direct implementation first, a helper on the second
  real use, a shared component only once the behaviour is stable. Do not wrap Angular Material
  merely to avoid referencing it.
- Do not delete stable unused code just because it is unused; freeze it and stop extending it.

## Working conventions for AI agents

- All implementation follows the slice workflow in `docs/08-implementation/01-workflow.md`: read the slice's spec references, write the failing tests first, implement inside the module layout, run the canonical verification commands, then tick the plan checkbox. The current release's slices live in `docs/08-implementation/02-slices-*.md`.
- Before implementing a feature, read the relevant `docs/02-requirements/*.md` section and the current release plan in `docs/07-plans/`.
- Document authority follows `docs/document-control.md`; an Accepted ADR cannot be overridden by stale detailed text.
- A decision that contradicts an accepted ADR requires a replacement ADR — do not code around it.
- ADR-006…011 are Proposed: resolve them before building on the affected area.
- Every feature ships in Persian only (ADR-012), but Jalali↔Gregorian round-trip tests and rial/toman exactness tests are required wherever dates or money appear. Include Latin-name/mixed-script fixtures in list, print, and message tests.
- Definition of Done: `docs/05-quality/04-definition-of-done.md`. Requirements use MUST/SHOULD/MAY per RFC 2119.
- Test data is always fictional; never real patient data in dev/test.
- No PHI or secrets in logs, URLs, commits, or error messages.
- No real patient data anywhere until the Real-Data Authorization Gate in `docs/05-quality/01-security-privacy.md` is approved.

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
| Module ownership | docs/04-architecture/07-context-module-map.md |
| Transactions/events | docs/04-architecture/08-transaction-event-semantics.md |
| Event contracts | docs/04-architecture/10-event-catalog.md (full target set — see build sequencing for what's built now) |
| Browser sessions | docs/04-architecture/09-authentication-session-architecture.md |
| What's built now vs. deferred | docs/07-plans/00-build-sequencing.md |
| Current work | docs/07-plans/README.md |
| How to execute and verify work | docs/08-implementation/01-workflow.md |
| Unresolved decisions | docs/open-decisions.md |
| Risks | docs/07-plans/risks.md |
