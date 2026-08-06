# Farsi, RTL, and Mixed-Script Guidelines

## Locale contract

v1 ships one application locale: `fa-IR`. The shell is RTL and date presentation is Jalali. There is no runtime language, direction, or calendar switch.

The patient Latin-name field and mixed Persian/Latin content remain supported. A patient's preferred communication language is stored for future use but does not select a different v1 template.

## Translation resources

Static UI text lives in feature-scoped `i18n/fa-IR/*.json` resources. Components and templates do not hardcode user-facing Persian prose. CI fails on missing/unused keys and invalid interpolation parameters.

Configurable business content—procedure names, appointment types, journey stages, and templates—uses stable codes plus database translation rows. v1 requires `fa-IR` rows.

Backend responses contain stable English error codes and safe parameters. The UI owns Farsi wording.

## Direction

- Application chrome is RTL.
- Use CSS logical properties instead of hard-coded left/right.
- Directional icons mirror only when their meaning is directional.
- Chronology, dental anatomy, odontogram orientation, and tooth numbering do not mirror.
- Phone, email, URL, identifier, and technical-code values render in isolated LTR runs.

## Mixed-script content

- Store native and optional Latin names separately; do not auto-transliterate.
- Use Unicode bidi isolation for dynamic names, codes, phone numbers, amounts, and identifiers inside Farsi sentences.
- Test long Latin names, Persian/Latin digit mixtures, email addresses, and technical codes in lists, headers, dialogs, print, and messages.
- Never build translated sentences by concatenating directional fragments.

## Iranian identity and search

Normalization is for search, never display:

- Accept Persian and Latin digits.
- Normalize Arabic/Persian Yeh and Kaf variants.
- Ignore optional diacritics and Tatweel.
- Normalize common whitespace and punctuation variants.
- Normalize domestic and international Iranian mobile forms.
- Retain the original entered value beside the normalized search value.

National code remains optional and policy-controlled. Address forms support Iranian province/city/postal-code structure plus free-form exceptions. Sorting uses Farsi locale collation with a deterministic mixed-script fallback.

## Dates and time

- The default office timezone is `Asia/Tehran` and is never inferred from the browser.
- The backend stores UTC instants and Gregorian date-only values.
- The API exchanges RFC 3339 timestamps and Gregorian ISO dates.
- The UI accepts, filters, and displays Jalali dates through one tested adapter.
- Date controls identify Jalali input and reject ambiguous free-form dates.
- Official holidays and office closures are versioned office configuration.
- Round-trip tests prove Jalali input maps to the expected canonical value and returns to the same Jalali value.

## Numbers and money

- Accept Persian and Latin digits and normalize before validation.
- Store canonical integer rials; never calculate money with JavaScript floating point.
- Rial/toman inputs and outputs always show the unit.
- One toman equals ten rials exactly.
- A rial value not divisible by ten displays in explicitly labeled rials rather than being rounded.
- API `amountRial` values are decimal strings converted to `bigint` by the client adapter.

## Printing

Patient-facing templates are Persian-only. PDFs embed an approved Persian font and pass shaping, bidi, clipping, and mixed-script visual tests. Printed dates identify Jalali presentation; structured machine exports retain canonical Gregorian/UTC values.

## Future locale changes

A second locale requires a replacement ADR, translation resources, LTR design/visual testing, and patient-document review. The v1 code preserves CSS logical properties, locale-neutral backend codes, and date/number adapters so that change does not contaminate domain logic.
