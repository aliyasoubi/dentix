# Treatment Planning Requirements

## Plan structure

A treatment plan is versioned and contains title, clinical objective, phases, procedure items, alternatives, fees, discounts, notes, and patient decision history.

## Phase examples

  - Urgent care
  - Disease control
  - Definitive treatment
  - Maintenance
  - Custom phase

## Item data

  - Procedure catalog item and immutable display snapshot
  - Tooth, surface, arch, or region
  - Quantity
  - Responsible provider or provider type
  - Estimated duration
  - Fee and discount
  - Priority
  - Clinical rationale
  - Status

## Plan lifecycle

  - Draft
  - Presented
  - Partially accepted
  - Accepted
  - Declined
  - Superseded
  - Completed
  - Cancelled

A plan version presented to a patient MUST remain reproducible even if the procedure catalog or fee later changes.

## Patient decisions

The system records accepted and declined items, decision date, staff member, patient acknowledgment method, and notes. Reversing a decision creates a new event.

## Scheduling integration

An accepted item or phase can create:

  - A planned appointment, or
  - A booked appointment when date/time are selected

Procedure, tooth/surface, provider preference, duration, and journey context transfer without manual re-entry.

## Journey creation

A plan or selected items may start a Treatment Journey when care is multi-visit, depends on healing or laboratory work, or requires longitudinal progress tracking. Creating a journey is optional and must not be required for simple treatment.

## Financial boundary

The plan displays clinic fee, discount, and patient amount. No insurance fields, estimates, payer balances, deductibles, or claim data exist.

  - Presented plan versions snapshot each amount in canonical Iranian rials.
  - The UI and printout may display rial or toman according to the selected mode, but the unit MUST appear beside headings and totals.
  - User-entered toman values convert exactly to rials by multiplying by ten. A rial value that is not divisible by ten must not be silently rounded when displayed in toman.

## Acceptance examples

  - Editing a draft plan does not change the version already presented.
  - A procedure completed from a scheduled plan item updates the plan without duplicating the procedure.
  - The patient-facing printout is Persian-only in v1 (ADR-012); rial/toman unit and Jalali date appear beside every amount and date.
