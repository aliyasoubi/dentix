# Scheduling Requirements

## Calendar views

The system MUST provide day, multi-day, week, provider, and operatory views. The default front-office view is configurable per user.

## Iranian calendar and time rules

  - The office timezone defaults to Asia/Tehran and is explicit in configuration.
  - Users enter and view schedule dates in Jalali form. The presentation boundary converts to canonical Gregorian dates and UTC instants.
  - APIs exchange RFC 3339 timestamps and Gregorian ISO dates. Jalali strings are presentation/input values and are converted at the application boundary.
  - Date pickers and printed schedules MUST identify dates as Jalali.
  - Iranian official holidays and office-specific closures are configurable; holiday data is versioned rather than hard-coded permanently.
  - Day, week, and chronological orientation remain chronological in the RTL interface; time direction is not mirrored.

## Appointment model

An appointment includes patient, provider, operatory, appointment type, start instant, office timezone, duration, reason, planned procedures, status, confirmation state, notes, source, and version.

## Lifecycle

Primary path:

Requested → Scheduled → Confirmed → Arrived → Seated → In treatment → Completed

Alternate terminal or transfer states:

  - Cancelled
  - No-show
  - Rescheduled, linked to the replacement appointment

Every status transition MUST record user, time, previous state, new state, and reason when required.

## Availability and conflicts

The scheduler MUST enforce provider and operatory availability, blocked time, holidays, and overlapping appointment rules. Authorized users may override selected conflicts only after supplying a reason.

## Interaction requirements

  - Quick-create from an empty time slot
  - Drag to reschedule
  - Resize to change duration
  - Keyboard access for all actions
  - Immediate display of validation and conflict reasons
  - Undo for a recently completed low-risk reschedule when no dependent change occurred
  - Optimistic visual feedback only when server conflict handling remains authoritative

## Planned appointments

A planned appointment represents the recommended next visit and may originate from a treatment-plan phase, journey stage, encounter, or recall. It includes recommended provider, duration, procedure set, target date or date range, priority, and notes.

Planned appointments without bookings MUST appear in the Follow-up Center.

## Waitlist

A waitlist entry includes preferred dates, time window, provider, appointment type, duration, priority, expiry, contact attempts, and status.

## Recall

A recall definition contains type, interval, due date, grace period, provider preference, and communication rules. Creating an appointment from recall links the appointment and closes or advances the recall instance.

## Lab readiness

Appointments linked to a lab order MUST display the lab state. The UI MUST warn when a delivery appointment occurs before the expected return date or when the case is not Ready. Authorized staff may continue after recording an override reason.

## Performance targets

  - Initial visible schedule under normal load: p95 below 2 seconds
  - Drag feedback: below 100 ms locally
  - Conflict response after save request: p95 below 500 ms on supported office network, excluding external services

## Acceptance examples

  - Two receptionists rescheduling the same appointment cannot silently overwrite each other.
  - A cancelled appointment retains the original slot, reason, and replacement link.
  - Chronological calendar orientation does not mirror in RTL; clinical and time semantics are never affected by layout direction.
  - Entering a Jalali appointment date stores the expected canonical instant and reopening it reproduces the same Jalali date/time in `Asia/Tehran`.
