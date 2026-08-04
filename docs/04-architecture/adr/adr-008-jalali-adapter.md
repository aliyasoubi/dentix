# ADR-008: Jalali Calendar Library and Date Adapter

- **Status:** Proposed — must be accepted during Release 0.5
- **Gap identified in design review:** ADR-005 defines the calendar contract but not the implementing library. This choice touches every date control and must precede feature work.

## Options to evaluate
1. **date-fns-jalali** + custom Angular Material `DateAdapter` — actively used approach; pairs with date-fns.
2. **luxon + jalaali-js conversion at the boundary** — precise zone handling; two libraries to reconcile.
3. **@js-temporal polyfill (Temporal API) with `u-ca-persian`** — standards-based; verify Angular Material adapter maturity.

## Decision drivers
Correct Jalali leap-year rule, Asia/Tehran historical offsets, Angular Material datepicker integration, backend/frontend consistency (same conversion results in Node and browser), bundle size, maintenance activity.

## Required proof (walking skeleton)
Round-trip fixtures across Nowruz, Esfand 29/30, Jalali leap years, and year boundaries — identical results in API and UI.

## Decision
_To be recorded, with the fixture suite as the acceptance test._
