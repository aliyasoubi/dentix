# Configuration Catalog

- **Status:** Accepted 2026-08-04. Defines what is configuration, at which layer, and what is deliberately NOT configuration.
- **Language rule:** code, schemas, API fields, config keys, error codes, logs, and comments are English. Product-authored Farsi UI prose lives in frontend translation resources; configurable Farsi business labels/templates live in database translation rows. Patient names, addresses, and clinical/user-entered text are stored exactly as entered and are not translated.

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
| Localization | `locale` | `fa-IR` (fixed in v1 per ADR-012) |
| | `calendarDisplay` | `JALALI` (fixed in v1) |
| | `timezone` | `Asia/Tehran` (IANA; config, never hardcoded in logic) |
| | `holidayCalendar` | versioned Iranian holiday data + office closures |
| Money | `defaultUnit` | `RIAL` \| `TOMAN` (changing it never touches stored values) |
| Patients | `nationalCodeValidation` | on/off; absence never blocks registration |
| | `duplicateDetectionThresholds` | scoring cutoffs for warning queue |
| Scheduling | office hours, appointment types, default durations, operatories, conflict-override policy | office-editable |
| Clinical | procedure catalog + effective-dated fees, journey stage templates, note templates, consent templates | translated via DB translation rows |
| Finance | discount/refund/reversal thresholds, manager-approval toggles, receipt numbering format, procedure-completion charge mode (draft vs posted) | |
| Communications | reminder timing rules, message templates, sender identity | templates versioned |
| Privacy | retention settings, sensitive-document audit policy | values set after legal review |

### Layer 3 — User preferences (per user, low-risk, not audited beyond normal history)

Default calendar view (day/week/provider), default landing page, density where offered, optional money display-unit override, and table column widths. User preferences may never override Layer-2 policy or any invariant.

### Layer 4 — Frontend bootstrap config (public JSON, fetched before shell render)

Read-only projection needed before authentication: fixed v1 `locale`, `dir`, and `calendarDisplay`; configured `timezone` and `money.defaultUnit`; API base URL; and app version. **No secrets, ever.** See UX-DS-001 §2.1 for the startup sequence.

## Deliberately NOT configuration (invariants — changing these means changing code + ADR)

- Canonical storage rules: UTC instants, Gregorian ISO dates, integer rial money (`IRR`).
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

## Excluded configuration

A second application locale, another calendar presentation, or another currency is not activated through configuration in v1. Each requires a replacement ADR and the corresponding code, schema, migration, and verification work. Configuration must not advertise an unsupported option.
