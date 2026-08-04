# Configuration Catalog

- **Status:** Accepted 2026-08-04. Defines what is configuration, at which layer, and what is deliberately NOT configuration.
- **Language rule:** all code, schemas, API fields, config keys, error codes, logs, and comments are **English**. Farsi appears in exactly two places: frontend i18n resource files (static UI text) and database translation rows (configurable business content). Nothing else.

## The four configuration layers

### Layer 1 — Deployment configuration (environment / secret manager)

Set per environment by the operator. Never in the database, never sent to the frontend, secrets never in ordinary config files.

| Key group | Examples |
|---|---|
| Database | connection string, pool size |
| Redis / queue | connection, queue names |
| Object storage | endpoint, bucket, credentials |
| Identity | OIDC issuer, client IDs/secrets |
| Messaging providers | SMS/email API keys, callback secrets |
| Platform | base URLs, TLS, log level, trace sampling |

### Layer 2 — Office configuration (database, Administration UI, audited)

Changed by an authorized administrator; every change produces an audit event (previous value, new value, user, timestamp). Loaded by the backend at startup/refresh; a read-only public subset is projected to the frontend (Layer 4).

| Group | Keys | v1 value / notes |
|---|---|---|
| Localization | `locale` | `fa-IR` (only maintained locale per ADR-012) |
| | `calendarDisplay` | `JALALI` (only v1 adapter; Gregorian display later = new adapter + this key) |
| | `timezone` | `Asia/Tehran` (IANA; config, never hardcoded in logic) |
| | `holidayCalendar` | versioned Iranian holiday data + office closures |
| Money | `canonicalCurrency` | `IRR` — read-only in v1; changing it requires a replacement ADR |
| | `displayUnit` | `RIAL` \| `TOMAN` (IRR-specific display concept; changing it never touches stored values) |
| Patients | `nationalCodeValidation` | on/off; absence never blocks registration |
| | `duplicateDetectionThresholds` | scoring cutoffs for warning queue |
| Scheduling | office hours, appointment types, default durations, operatories, conflict-override policy | office-editable |
| Clinical | procedure catalog + effective-dated fees, journey stage templates, note templates, consent templates | translated via DB translation rows |
| Finance | discount/refund/reversal thresholds, manager-approval toggles, receipt numbering format, procedure-completion charge mode (draft vs posted) | |
| Communications | reminder timing rules, message templates, sender identity | templates versioned |
| Privacy | retention settings, sensitive-document audit policy | values set after legal review |

### Layer 3 — User preferences (per user, low-risk, not audited beyond normal history)

Default calendar view (day/week/provider), default landing page, density where offered, optional money display-unit override (spec 02-requirements/06), table column widths. User preferences may never override Layer-2 policy or any invariant.

### Layer 4 — Frontend bootstrap config (public JSON, fetched before shell render)

Read-only projection of Layer 2 needed before authentication: `locale`, `dir` (derived from locale), `calendarDisplay`, `timezone`, `money.displayUnit`, API base URL, app version. **No secrets, ever.** See UX-DS-001 §2.1 for the startup sequence.

## Deliberately NOT configuration (invariants — changing these means changing code + ADR)

- Canonical storage rules: UTC instants, Gregorian ISO dates, integer minor-unit money.
- Domain state machines (appointment lifecycle, encounter states, plan states, ledger entry types).
- Immutability rules (ADR-004), permission semantics, audit coverage.
- Tooth numbering internals (display system FDI/Universal is a clinical setting, but anatomical identifiers are code).
- The 1 toman = 10 rial ratio.

## Where UI text lives (decision)

| Content | Lives in | Why |
|---|---|---|
| Static UI text (labels, buttons, menus, validation wording) | Frontend `i18n/fa-IR/*.json`, feature-scoped, lazy-loaded, CI-checked for missing keys | Versioned with the components using it; no network needed to render; testable; cacheable |
| Configurable business content (procedure names, appointment types, stage names, lab work types, templates) | Database translation rows (`*_translation(locale, name, …)`) | Office edits at runtime without a deploy |
| Backend messages | Never prose — stable English codes (`APPOINTMENT_CONFLICT`) + safe parameters; frontend maps code → Farsi text | Adding a locale later is frontend-only; logs stay searchable |
| Clinical free text | Stored exactly as entered, never translated | Safety (ADR-003/012) |

## Currency extensibility (future USD and others)

v1 remains single-currency IRR (ADR-005). To make future multi-currency a bounded change instead of a refactor:

1. **Schema hedge (adopt now):** every money column stores minor-unit integer `amount` **plus** `currency CHAR(3) NOT NULL DEFAULT 'IRR'`. Zero behavioral cost in v1; eliminates the future ledger migration.
2. The `Money` value object in code already carries `{ amount, currency }`; arithmetic across different currencies throws.
3. `displayUnit` (RIAL/TOMAN) is defined per currency — it is an IRR presentation concept, not a generic one. A future USD shows dollars, untouched by rial/toman logic.
4. What multi-currency does NOT get for free (and why it still needs a replacement ADR): exchange rates, mixed-currency balances and reconciliation, per-currency receipt formats. The hedge makes the door cheap to open, not open.

## Scale path summary (no full refactor required)

| Future need | What changes | What doesn't |
|---|---|---|
| Add a language (e.g., English) | New `i18n/en-US/*.json`, DB translation rows, replacement ADR for ADR-012, LTR visual QA | Code, schema, API |
| Add a calendar display (Gregorian) | New calendar adapter + `calendarDisplay` option | Storage (already Gregorian/UTC) |
| Add a currency | Replacement ADR for ADR-005, rate/receipt logic | Ledger schema (currency column exists), Money type |
| Second office / other timezone | `office_id` already on rows; timezone already config | Domain logic |
