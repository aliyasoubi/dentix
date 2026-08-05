# Data Model Baseline

## Common columns

Most business tables include:

  - UUID primary key
  - `office_id`
  - `created_at`, `created_by`
  - `updated_at`, `updated_by` for mutable drafts/configuration
  - version for optimistic concurrency
  - optional `archived_at`

Signed clinical and posted financial records use append-only or version tables rather than ordinary updates.

## Core table groups

### Identity and office

  - office
  - `user_account`
  - provider
  - role
  - permission
  - `user_role`
  - `role_permission`
  - operatory

### Patient

  - patient
  - `patient_address`
  - `patient_identifier`
  - `patient_name`
  - `patient_contact`
  - `patient_relationship`
  - `patient_alert`
  - `patient_alias`
  - `patient_merge_event`

### Scheduling

  - appointment
  - `appointment_status_event`
  - `appointment_type`
  - `provider_availability`
  - `schedule_block`
  - `planned_appointment`
  - `waitlist_entry`
  - `recall_definition`
  - `recall_instance`

### Clinical

  - encounter
  - `clinical_note_version`
  - `medical_history_version`
  - finding
  - diagnosis
  - `procedure_record`
  - `tooth_state_event`
  - `perio_exam`
  - `perio_measurement`

### Treatment continuity

  - `treatment_plan`
  - `treatment_plan_version`
  - `treatment_plan_phase`
  - `treatment_plan_item`
  - `treatment_decision_event`
  - `treatment_journey`
  - `journey_stage_event`
  - `follow_up_task`
  - laboratory
  - `lab_order`
  - `lab_order_status_event`

### Finance

  - `ledger_entry`
  - `payment_allocation`
  - receipt
  - `day_end_close`

### Documents and platform

  - document
  - `document_version`
  - communication
  - `outbox_event`
  - `audit_event`

## Money

> **Hedge adopted 2026-08-04 (see 06-configuration-catalog.md):** every money column stores the
> minor-unit integer amount **plus** `currency CHAR(3) NOT NULL DEFAULT 'IRR'`. v1 behavior is
> unchanged (single currency); the column removes the future multi-currency ledger migration.

Canonical currency is Iranian rial (IRR). Persist monetary values as signed bigint rial amounts, such as `amount_rial`, with domain range checks. Toman is a display/input unit and is not a second stored currency; one toman converts to ten rials exactly. Fee, treatment-plan, receipt, and ledger snapshots retain canonical rial values and the display unit used on issued documents. Future multi-currency support requires a replacement ADR and migration.

## Dates

  - Instants: timestamptz, stored in UTC
  - Office business date: date
  - Durations: integer minutes where applicable
  - Office timezone: IANA zone identifier, default Asia/Tehran
  - User display calendar preference: Jalali or Gregorian
  - Canonical persisted dates remain Gregorian/UTC

## Text and translations

Configurable bilingual entities use stable base rows plus translation rows, for example `procedure_catalog` and `procedure_catalog_translation`(locale, name, description).

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
