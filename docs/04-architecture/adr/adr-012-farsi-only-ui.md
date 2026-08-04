# ADR-012: Farsi-Only UI with Jalali-Only Presentation

- **Status:** Accepted
- **Date:** 2026-08-03
- **Supersedes:** ADR-003 (Runtime Persian/English Localization)
- **Amends:** ADR-005 (presentation clauses only — canonical rules unchanged)

## Context
The office operates in Persian. Dual-language runtime UI (fa-IR + en-US with direction switching)
roughly doubles the UI test matrix (E2E, visual regression, print) and adds runtime
direction-switching complexity for a capability the office does not need in v1.

## Decision
1. The v1 UI ships **fa-IR only**, laid out **RTL-only**. No runtime language or direction switching.
2. Dates are presented and entered in **Jalali only**. The Gregorian display toggle is removed from the UI.
3. **Canonical storage and APIs are unchanged:** UTC instants and Gregorian ISO dates remain the only persisted/interchanged forms (per ADR-005); Jalali conversion happens at the presentation boundary. Jalali/Gregorian round-trip test suites remain mandatory.
4. The **Latin patient-name field is retained** (passports, referrals, foreign patients). Latin/technical strings inside Persian text still require Unicode bidi isolation; technical codes remain LTR.
5. Print templates (receipts, statements, plans, consents) are **Persian-only** in v1.

## Future internationalization — stated product direction
The owner intends the product to possibly become international later (additional languages,
calendars, and currencies). Therefore the items below are not optional hygiene: they are
**mandatory, CI-enforced requirements** that keep internationalization a bounded future project
instead of a rewrite.

## Retained hedges (mandatory, CI-enforced)
- All UI strings stay externalized in translation resources — no hardcoded Persian in components. Adding a locale later is a translation task, not a rewrite.
- CSS logical properties remain mandatory (already required for correct RTL); no hardcoded left/right.
- Backend error codes stay locale-neutral; the UI owns wording (unchanged).
- Locale-aware date/number formatting APIs are used rather than string concatenation.
- **Calendar behind an adapter:** all UI date presentation goes through one calendar-adapter interface (Jalali is the only v1 implementation). Adding Gregorian or another calendar display later is a new adapter + config, not a UI rewrite. Canonical Gregorian/UTC storage already guarantees the data layer is international.
- **Timezone stays configuration**, defaulting to Asia/Tehran (IANA), never hardcoded in logic — a second office in another zone changes config, not code.
- **Currency stays canonical-integer-rial behind the Money type** per ADR-005; multi-currency remains excluded and would need a replacement ADR with migration, as already specified.

## Implementation mechanism (added 2026-08-04)
The UI design system (docs/03-ux/05-ui-design-system.md, UX-DS-001) implements this ADR via
**office-level configuration**: locale is loaded before the shell renders, direction is derived
from locale, and there is no runtime toolbar language switch. v1 configuration is fa-IR/RTL only;
adding a locale later is a configuration + translation-resource task, per the hedges below.

## Consequences
- E2E, visual-regression, accessibility, and print test matrices shrink to one language and one direction.
- Runtime locale/direction switching code, the en-US resource pipeline, English templates, and Jalali/Gregorian display-toggle UI are removed from scope.
- Docs referencing "Persian and English critical workflows" now read "Persian critical workflows"; affected files carry a banner pointing here rather than being rewritten wholesale.
- Reintroducing English (or any second locale/LTR) requires a replacement ADR and budget for translation, LTR visual QA, and bilingual print templates.
- The package keeps the historical name "Bilingual …" in the master document lineage; the v1 product is Farsi-only.
