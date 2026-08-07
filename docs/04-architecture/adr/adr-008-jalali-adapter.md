# ADR-008: Jalali Calendar Library and Angular DateAdapter

- **Status:** Proposed — accept via the acceptance checklist below
- **Constraint:** Jalali is presentation/input only; Gregorian/UTC stays canonical (ADR-005, ADR-012). All UI date presentation goes through one calendar-adapter interface.

## Recommended decision

1. **`date-fns-jalali`** as the single Jalali formatting/arithmetic library (active fork of date-fns tracking its API), wrapped in a **custom Angular Material `DateAdapter`** owned by the design system. No other Jalali library may be imported by feature code.
2. **`jalaali-js`** (tiny, conversion-math-only) is the approved fallback kernel if `date-fns-jalali` maintenance stalls — the adapter interface makes swapping it a bounded change.
3. `moment-jalaali` is rejected (Moment is in maintenance mode; bundle weight).
4. **Cross-validation in tests, not in product code:** the fixture suite verifies the library's conversions against the platform's ICU implementation (`Intl.DateTimeFormat` with `calendar: 'persian'`) so a library defect cannot pass silently.
5. Persian digit rendering is a formatting concern of the adapter/display layer; domain and API values remain ASCII Gregorian.

## Shared fixture suite (blocking; lives in the shared kernel and runs in CI for backend and frontend)

Fixture categories — generated once, reviewed by a human against a trusted source, then frozen:

- Nowruz boundary days (Esfand 29/30 ↔ Farvardin 1) for a leap and a non-leap Jalali year.
- Esfand 30 existence exactly in Jalali leap years; rejection of Esfand 30 input in non-leap years.
- Gregorian year boundary (Dey) and Jalali year boundary in `Asia/Tehran`.
- Round-trip law: for every fixture date, Jalali → Gregorian → Jalali is identity, and instant → Jalali date in `Asia/Tehran` matches the business-date rule in `04-data-model.md`.
- Persian and Latin digit input parsing to the same canonical value.

## Acceptance checklist (Release 0.5 proofs)

- [ ] Material date picker bound to a canonical Gregorian `date` value, entering and displaying Jalali only.
- [ ] Fixture suite green in backend and frontend CI, including the ICU cross-check.
- [ ] Adapter is the only import path for Jalali behavior (architecture lint rule).
