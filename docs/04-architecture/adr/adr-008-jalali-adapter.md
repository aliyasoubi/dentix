# ADR-008: Jalali Calendar Library and Angular DateAdapter

- **Status:** Accepted (S5, Release 0.5) — all three acceptance-checklist items proven; see the implementation note above for the one refinement to the original recommended decision (jalaali-js as kernel's primary conversion engine, not just a fallback).
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

## Implementation note (S5): which library does which job

`date-fns-jalali`'s Jalali getters/constructors (`getYear`, `newDate`, …) read and write a JS `Date` object's **local-time** fields — correct and unavoidable for a Material `DateAdapter`, which by design operates on the browser's local calendar day, same as Material's own built-in Gregorian adapter. It is the wrong tool for `@dentix/kernel`'s conversion functions, though: kernel code has no fixed timezone (it runs in whatever TZ the Node process or browser happens to have), and a UTC-midnight `Date` read through local getters can land on the wrong calendar day entirely — verified directly: constructing a UTC-midnight date and reading it back with local getters in a negative-UTC-offset timezone produces an off-by-one day. `jalaali-js`'s own docs independently confirm this exact hazard for its own `Date`-argument call form.

`jalaali-js` sidesteps the whole class of bug: its core functions take and return plain `(year, month, day)` integers, never a `Date` object, so there's no timezone to get wrong. This ADR's original text named it only as a fallback if `date-fns-jalali` maintenance stalled; S5 instead uses it as kernel's primary conversion engine, with `date-fns-jalali` scoped to the frontend-only Material adapter. Cross-validated against the platform's own ICU (`Intl.DateTimeFormat`, `calendar: 'persian'`) for every fixture in `packages/kernel/src/jalali.spec.ts` — `jalaali-js`'s docs note its Borkowski-algorithm result diverges from ICU's rule outside Gregorian year range [1800, 2256]; every fixture used falls well inside it.

## Acceptance checklist (Release 0.5 proofs)

- [x] Material date picker bound to a canonical Gregorian `date` value, entering and displaying Jalali only. *(S5: `apps/web/src/app/core/jalali/jalali-date-adapter.ts` (`JalaliDateAdapter`) + `jalali-date-formats.ts` + `provide-jalali-date-adapter.ts`, wired app-wide in `app.config.ts`. Wired into the patient create form's `dateOfBirth` field (`features/patients/patients-page.ts/html`) — `mat-datepicker` displays/accepts Jalali only; `submit()` converts through `DateAdapter.toIso8601()` to the canonical Gregorian ISO string the backend's `CreatePatientCommand.dateOfBirth`/`patient.date_of_birth` column store (`apps/api/.../create-patient.use-case.ts`, `patient.orm-entity.ts`). Real-browser human check: opened the picker, jumped to 1403 via the year/month grids (all 12 Persian month names and 7 weekday names render correctly, first day of week Saturday), selected فروردین ۱۴۰۳ روز ۱ (the Nowruz fixture), submitted, and the search results table round-tripped it back as `۱۴۰۳/۰۱/۰۱` — proving the full picker → ISO → Postgres → API → Jalali-display path, not just unit tests. 14 adapter unit tests in `jalali-date-adapter.spec.ts` additionally cover the Esfand-30-rejection-in-non-leap-year and cross-Nowruz `addCalendarDays` cases the browser check doesn't exercise.)*
- [x] Fixture suite green in backend and frontend CI, including the ICU cross-check. *(S5: `packages/kernel/src/jalali.spec.ts` — Nowruz boundaries for a leap and non-leap year, Esfand 30 existence/rejection, the Jalali month of Dey spanning the Gregorian year boundary, round-trip law both directions, Persian/Latin/mixed-digit parsing, and every fixture cross-checked against `Intl.DateTimeFormat`'s own persian calendar — 33 tests, all green. Runs in kernel's own Jest suite, which both `apps/api` and `apps/web` depend on and build before their own tests run. Additionally exercised at the frontend-runtime layer by `apps/web/src/app/core/jalali/jalali-date-adapter.spec.ts`'s 14 tests (Vitest, real `JalaliDateAdapter` instances) and the real-browser human check above.)*
- [x] Adapter is the only import path for Jalali behavior (architecture lint rule). *(S5: `apps/web/.dependency-cruiser.json`'s `no-direct-jalali-library-imports` rule forbids importing `date-fns-jalali` from anywhere under `apps/web/src` except `core/jalali/jalali-date-adapter.ts` itself; `npm run lint:arch` enforces it. Feature code reaches Jalali behavior only through Material's injected `DateAdapter`/`MAT_DATE_FORMATS`, or through `@dentix/kernel`'s pure conversion functions.)*
