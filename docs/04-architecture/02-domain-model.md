# Domain Model

## Bounded contexts

### Patient Registry

Owns patient identity, contact data, relationships, alerts, and duplicate/merge rules.

### Scheduling

Owns appointments, availability, appointment types, waitlist, planned appointments, and lifecycle transitions.

### Clinical

Owns encounters, histories, notes, findings, diagnoses, odontogram, perio exams, and procedure completion.

### Treatment Planning

Owns plans, versions, phases, item decisions, fee snapshots, and treatment-to-schedule handoff.

### Treatment Continuity

Owns journeys, stage transitions, follow-up tasks, recall instances, and next-action integrity.

### Laboratory

Owns laboratories, lab orders, readiness, revisions, and appointment dependency.

### Patient Finance

Owns immutable ledger entries, allocation, receipts, statements, and day-end summaries.

### Documents and Communications

Owns document metadata/storage lifecycle and transactional patient communication history.

### Audit

Receives security and business audit events and provides controlled query access.

## Key invariants

  - Signed clinical content is never overwritten.
  - Posted ledger entries are never updated or deleted.
  - Appointment overlap requires policy-compliant override.
  - Active journeys should have a next action.
  - Lab-dependent appointments expose readiness.
  - Plan versions presented to patients remain reproducible.
  - Patient merge retains source identity and history.

## Aggregate candidates

  - Patient
  - Appointment
  - Encounter
  - TreatmentPlan
  - TreatmentJourney
  - LabOrder
  - LedgerAccount/PatientLedger
  - RecallInstance
  - FollowUpTask

Large clinical timelines and reports are read models, not aggregates.

## Domain event examples

  - PatientCreated
  - AppointmentScheduled
  - AppointmentNoShowRecorded
  - EncounterSigned
  - ProcedureCompleted
  - TreatmentPlanPresented
  - TreatmentItemAccepted
  - JourneyStageChanged
  - FollowUpTaskCompleted
  - LabOrderSent
  - LabOrderMarkedReady
  - PaymentPosted
  - LedgerEntryReversed

## Example event reaction

ProcedureCompleted may update a linked plan item, advance a journey, and create a draft charge. These reactions must be idempotent and auditable.
