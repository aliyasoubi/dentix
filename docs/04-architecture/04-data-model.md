# Data Model Baseline

## Common columns

Most business tables include:

  - UUID primary key

  - office\_id

  - created\_at, created\_by

  - updated\_at, updated\_by for mutable drafts/configuration

  - version for optimistic concurrency

  - optional archived\_at

Signed clinical and posted financial records use append-only or version tables rather than ordinary updates.

## Core table groups

### Identity and office

  - office

  - user\_account

  - provider

  - role

  - permission

  - user\_role

  - role\_permission

  - operatory

### Patient

  - patient

  - patient\_address

  - patient\_identifier

  - patient\_name

  - patient\_contact

  - patient\_relationship

  - patient\_alert

  - patient\_alias

  - patient\_merge\_event

### Scheduling

  - appointment

  - appointment\_status\_event

  - appointment\_type

  - provider\_availability

  - schedule\_block

  - planned\_appointment

  - waitlist\_entry

  - recall\_definition

  - recall\_instance

### Clinical

  - encounter

  - clinical\_note\_version

  - medical\_history\_version

  - finding

  - diagnosis

  - procedure\_record

  - tooth\_state\_event

  - perio\_exam

  - perio\_measurement

### Treatment continuity

  - treatment\_plan

  - treatment\_plan\_version

  - treatment\_plan\_phase

  - treatment\_plan\_item

  - treatment\_decision\_event

  - treatment\_journey

  - journey\_stage\_event

  - follow\_up\_task

  - laboratory

  - lab\_order

  - lab\_order\_status\_event

### Finance

  - ledger\_entry

  - payment\_allocation

  - receipt

  - day\_end\_close

### Documents and platform

  - document

  - document\_version

  - communication

  - outbox\_event

  - audit\_event

## Money

> **Hedge adopted 2026-08-04 (see 06-configuration-catalog.md):** every money column stores the
> minor-unit integer amount **plus** `currency CHAR(3) NOT NULL DEFAULT 'IRR'`. v1 behavior is
> unchanged (single currency); the column removes the future multi-currency ledger migration.

Canonical currency is Iranian rial (IRR). Persist monetary values as signed bigint rial amounts, such as amount\_rial, with domain range checks. Toman is a display/input unit and is not a second stored currency; one toman converts to ten rials exactly. Fee, treatment-plan, receipt, and ledger snapshots retain canonical rial values and the display unit used on issued documents. Future multi-currency support requires a replacement ADR and migration.

## Dates

  - Instants: timestamptz, stored in UTC

  - Office business date: date

  - Durations: integer minutes where applicable

  - Office timezone: IANA zone identifier, default Asia/Tehran

  - User display calendar preference: Jalali or Gregorian

  - Canonical persisted dates remain Gregorian/UTC

## Text and translations

Configurable bilingual entities use stable base rows plus translation rows, for example procedure\_catalog and procedure\_catalog\_translation(locale, name, description).

## Indexing priorities

  - Normalized patient search values, including canonical Iranian mobile and optional national code

  - Appointment office/provider/operatory time ranges

  - Open tasks by due date and assignee

  - Active journeys by stage and next-action date

  - Lab orders by expected date and status

  - Ledger entries by patient/business date

  - Audit events by patient, actor, entity, and time

## Concurrency

The API requires the current version through ETag/If-Match or a version field for mutable business records. A mismatch returns a conflict with safe comparison metadata.
