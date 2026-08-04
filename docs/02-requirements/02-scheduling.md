# Scheduling Requirements

## Calendar views

The system MUST provide day, multi-day, week, provider, and operatory views. The default front-office view is configurable per user.

## Iranian calendar and time rules

  - The office timezone defaults to Asia/Tehran and is explicit in configuration.

  - Users may enter and view schedule dates in Jalali or Gregorian form according to preference; both views represent the same canonical date/time.

  - APIs exchange RFC 3339 timestamps and Gregorian ISO dates. Jalali strings are presentation/input values and are converted at the application boundary.

  - The selected calendar system MUST be visible in date pickers and printed schedules.

  - Iranian official holidays and office-specific closures are configurable; holiday data is versioned rather than hard-coded permanently.

  - Day, week, and chronological orientation remain consistent when switching RTL/LTR or Jalali/Gregorian presentation.

## Appointment model

An appointment includes patient, provider, operatory, appointment type, start instant, office timezone, duration, reason, planned procedures, status, confirmation state, notes, source, and version.

## Lifecycle

Primary path:

Requested -\> Scheduled -\> Confirmed -\> Arrived -\> Seated -\> In treatment -\> Completed

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

  - Persian and English views preserve the same chronological calendar orientation and do not mirror clinical or time semantics incorrectly.

  - Entering one appointment in Jalali view and reopening it in Gregorian view resolves to the same stored instant in Asia/Tehran.
