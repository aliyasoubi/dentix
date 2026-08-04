# Persian/English and RTL/LTR Guidelines

> **Scope change 2026-08-03 (ADR-012):** v1 is Farsi-only, RTL-only, Jalali-only presentation. Read every "Persian and English" / "RTL/LTR" / "Jalali/Gregorian presentation" requirement in this file as Persian / RTL / Jalali for the UI. Canonical Gregorian/UTC storage rules are unchanged. English-specific items are deferred until a replacement ADR reintroduces a second locale.


## Locale model

Supported UI locales:

  - fa-IR

  - en-US, configurable if another English locale is selected later

Each user has a preferred UI locale. Each patient has a preferred communication language. These are independent.

## Runtime switching

The UI supports runtime language and direction switching without signing out. Translation resources are feature-scoped, lazy-loaded, and validated in CI for missing keys.

## Direction

  - Persian application chrome is RTL.

  - English application chrome is LTR.

  - Use CSS logical properties instead of hard-coded left/right.

  - Directional icons mirror only when their meaning is directional.

  - Chronology, dental anatomy, and tooth orientation do not mirror merely because the UI is RTL.

## Mixed-script content

  - Patient names may include Persian and Latin forms.

  - Use Unicode bidi isolation for dynamic names, codes, phone numbers, and identifiers inside translated sentences.

  - Technical codes remain LTR.

  - Phone, email, URL, and numeric fields use appropriate direction handling.

## Iranian identity, contact, and address presentation

  - Mobile input accepts domestic and international Iranian formats and searches through one canonical normalized value.

  - National code is optional and its validation is controlled by office policy.

  - Address forms support Iranian province/city/postal-code structure but retain free-form lines for exceptions.

  - Persian alphabetical lists use locale-aware collation with deterministic handling of mixed-script names.

  - Original user-entered names, numbers, and addresses are retained; normalization is for search and validation only.

## Search normalization

Normalize for search, never for display:

  - Arabic Yeh and Persian Yeh

  - Arabic Kaf and Persian Kaf

  - Persian and Latin digits

  - Optional diacritics and Tatweel

  - Common whitespace and punctuation variants

Original entered text is retained.

## Dates, time, and Iranian calendar

  - The default office timezone is Asia/Tehran; it is stored explicitly and never inferred from a browser.

  - Backend stores instants in UTC and local business dates as Gregorian ISO dates where time-of-day is not meaningful.

  - Gregorian date/time is canonical for APIs, persistence, interoperability, and audit ordering.

  - Jalali is a required first-class input, display, filtering, and printing mode for patient-facing and office workflows.

  - Users may switch Jalali/Gregorian presentation without changing the underlying appointment, business date, or audit instant.

  - Date input always shows the selected calendar system and rejects ambiguous unlabeled date strings.

  - Iranian official holidays and office closures are supplied through a versioned configurable calendar.

  - Appointment chronology and dental anatomy are not mirrored by RTL direction.

## Numbers and money

  - Accept Persian and Latin digits and normalize before validation.

  - The canonical currency is Iranian rial (IRR); monetary values are stored as integer rials.

  - The UI supports explicitly labeled rial and toman entry/display. One toman equals ten rials.

  - The selected unit appears on fields, totals, tables, receipts, reports, and exports; context alone is not sufficient.

  - If exact toman presentation would require a fractional value, preserve the fraction or display rials rather than silently rounding.

  - Display grouping and digits follow locale and user preference.

  - Money calculations never use localized strings or JavaScript floating-point arithmetic as the source of truth.

## Bilingual configurable content

Catalog items use a stable code plus translation records. Example:

procedure.code = REST-COMP-1  
procedure\_translation\[en\].name = One-surface composite restoration  
procedure\_translation\[fa\].name = ترمیم کامپوزیت یک سطحی

## Printing

Every patient-facing template declares language mode: Persian, English, or bilingual; date mode: Jalali, Gregorian, or bilingual where approved; and monetary unit: rial or toman when amounts appear. PDF generation must embed or use deployed fonts that support both scripts and pass visual regression tests.

## Translation safety

  - Do not machine-translate signed clinical notes automatically.

  - Do not concatenate translated fragments to build sentences.

  - Backend errors expose stable codes and safe parameters; UI owns localized wording.
