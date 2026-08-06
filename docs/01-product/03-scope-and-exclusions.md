# Scope and Exclusions

## In scope

### Office and identity

  - Single office configuration
  - Users, providers, operatories, roles, and granular permissions
  - OIDC authentication, MFA, session management, and audit events

### Patients

  - Demographics, native and Latin names, family and responsible-party relationships
  - Contact information, Iranian mobile normalization, optional national-code data, Iranian address structure, language preferences, emergency contacts, alerts, and documents
  - Search with Persian character and digit normalization
  - Duplicate detection and controlled merge workflow

### Scheduling

  - Provider and operatory calendar
  - Appointment types, availability, blocked time, configurable Iranian holidays, conflict prevention
  - Appointment lifecycle, confirmation, cancellation, no-show, waitlist, planned appointments, and recall

### Clinical

  - Encounters, medical and dental history versions, chief complaint, findings, diagnosis, notes, attachments
  - Permanent, primary, and mixed-dentition odontogram
  - Periodontal examinations
  - Clinical timeline and signed-note amendments

### Treatment

  - Procedure and fee catalog
  - Versioned treatment plans, phases, alternatives, acceptance, and scheduling
  - Treatment journeys, stages, timeline, next action, follow-up tasks, and lab orders

### Finance

  - Patient charges, payments, discounts, adjustments, refunds, reversals, receipts, statements, and day-end reconciliation using canonical Iranian rial values with explicitly labeled rial/toman presentation

### Communications

  - Transactional appointment, recall, and follow-up reminders through integrated email/SMS providers
  - Communication history

### Reporting

  - Fixed scheduling, clinical, treatment, journey, lab, recall, financial, and administrative reports

### Platform

  - Farsi-only, RTL-only runtime UI (ADR-012)
  - Persian print templates
  - First-class Jalali date entry, display, and printing with Gregorian/UTC canonical storage and interchange
  - Asia/Tehran office timezone and configurable Iranian holiday calendar
  - Persian/Latin digit input, Iranian phone normalization, optional national-code validation, Persian sorting, and Iranian postal-address fields
  - Explicit rial/toman display with canonical storage in Iranian rials
  - Structured export, backup, restore, audit, monitoring, and integration-ready APIs

## Explicit exclusions

The following are not in the approved product scope:

  - Insurance patient records or insurance-plan support
  - Direct electronic claims submission
  - Automated insurance eligibility
  - Electronic remittance posting
  - Native X-ray sensor drivers
  - Full DICOM imaging workstation
  - Electronic prescribing
  - Credit-card vault
  - Payroll
  - General accounting
  - Marketing automation
  - Native mobile applications
  - Multi-location central billing
  - AI clinical diagnosis
  - AI-generated claim submission
  - Public marketplace
  - Custom report builder

## Deferred, not permanently excluded

Recorded product-owner decision (2026-08-06): the following are out of v1 scope but earmarked for future evaluation rather than permanently rejected. Bringing either in requires the scope control rule below plus the normal requirement/ADR process.

  - **Inventory/stock management.** A working standalone NestJS/TypeORM inventory backend for this office already exists (items, suppliers, FEFO batches, append-only stock ledger, expiry alerts) and continues operating as a separate system for now. Its ledger-style design is compatible with this architecture, so the expected future path is folding it in as an `inventory` bounded context/module per `04-architecture/03-module-boundaries.md` and `04-architecture/07-context-module-map.md`.
  - **Insurance and claims.** Remains fully excluded from v1 (see list above); future evaluation only.

## Boundary clarifications

### Patient finance versus accounting

The PMS owns the patient subledger. It does not own rent, payroll, supplier expenses, taxation, depreciation, general ledger, profit and loss, or balance sheet.

### Iranian localization boundary

Iranian localization is part of the approved core scope, not a later translation layer. The application uses `Asia/Tehran` as the default office timezone and presents Jalali dates only in v1 while preserving Gregorian/UTC values for APIs and storage. Optional national-code validation and address formatting are office-configurable and do not make a national identifier mandatory.

### Rial and toman boundary

The patient ledger and all fee snapshots store canonical values in Iranian rials (IRR). Users may enter and display values in rial or toman, but every input, screen, report, receipt, and export must identify the unit. One toman equals ten rials; conversion is exact and must never silently round or reinterpret an unlabeled value.

### Images and documents

The PMS stores ordinary images and documents and may link to an external imaging system. It does not acquire sensor data or provide advanced diagnostic processing.

### Messages

Transactional reminders are in scope. Promotional campaigns, lead funnels, and automated marketing segmentation are excluded.

### Multi-location readiness

The data model may include an `office_id` and avoid singletons, but the UI and operational requirements target one office. No centralized multi-location billing or cross-location scheduling is required.

## Scope control rule

A proposed feature must satisfy all three conditions before entering a release:

1. It supports a defined single-office workflow.
2. It does not reintroduce an excluded domain indirectly.
3. It has acceptance criteria, an owner, and a measurable user outcome.
