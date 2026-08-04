# Test Strategy

> **Scope change 2026-08-03 (ADR-012):** v1 is Farsi-only, RTL-only, Jalali-only presentation. Read every "Persian and English" / "RTL/LTR" / "Jalali/Gregorian presentation" requirement in this file as Persian / RTL / Jalali for the UI. Canonical Gregorian/UTC storage rules are unchanged. English-specific items are deferred until a replacement ADR reintroduces a second locale.


## Test pyramid

### Unit tests

Domain state transitions, canonical rial/toman conversion, Jalali/Gregorian date conversion, Asia/Tehran business-date rules, Iranian phone/identifier normalization, tooth/surface mappings, permission decisions, and template automation idempotency.

### Integration tests

Repositories, PostgreSQL constraints, transactions, outbox, object storage adapter, OIDC validation, Redis jobs, message callbacks, and report queries.

### API contract tests

OpenAPI compatibility, generated client, authorization matrix, error codes, idempotency, and concurrency conflicts.

### Component tests

Angular forms, direction switching, focus behavior, custom schedule cards, patient header, task panel, and ledger controls.

### End-to-end tests

Critical user journeys in English and Persian:

  - Register/search patient

  - Schedule/reschedule/cancel/no-show

  - Check in and document encounter

  - Chart tooth/surface and create treatment plan

  - Start implant or ortho journey

  - Create/complete task

  - Send/receive/ready lab order

  - Complete procedure and post charge/payment

  - Print receipt and patient record

## Specialized tests

### Clinical mapping

Golden test fixtures for FDI/Universal mapping, primary/permanent dentition, mixed dentition, and all selectable surfaces.

### Finance

Property-based tests ensure reversals return the prior balance, allocations sum correctly, and day-end totals equal source entries. Additional properties verify that rial-to-toman-to-rial conversion is exact, labels are never omitted, and no floating-point path changes a canonical rial value.

### Iranian calendar and identity formats

  - Jalali/Gregorian round-trip fixtures across year boundaries and leap years

  - Asia/Tehran appointment and business-date behavior

  - Iranian holiday and office-closure configuration

  - Persian/Latin digit input

  - Domestic/international Iranian mobile normalization

  - Optional national-code formatting and validation behavior

  - Persian collation and mixed-script sorting

### Concurrency

Simulate simultaneous appointment edits, treatment-plan updates, note edits, task completion, and ledger operations.

### Bilingual and visual

  - RTL/LTR screenshots for critical screens

  - PDF/print visual regression

  - Mixed Persian-English content

  - Persian/Latin digit entry

  - Jalali/Gregorian schedule and print equivalence

  - Explicit rial/toman labels and exact displayed totals

  - Font fallback and clipping checks

### Accessibility

Automated checks plus keyboard and screen-reader manual tests.

### Performance

Schedule rendering, patient search, clinical timeline, follow-up queue, and financial report load tests using representative office data.

### Recovery

Quarterly or release-gate restore tests in non-production.

## Test data

Use deterministic fictional data generators. Never copy production data into test environments without a formally approved anonymization process.
