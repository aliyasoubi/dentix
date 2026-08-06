# Release 2 — Front Office

**Goal:** reception can run a full day: calendar, appointment lifecycle, waitlist, recall, reminders.
**Spec in scope:** 02-requirements/02-scheduling.md, 02-requirements/07-documents-communications.md (reminders), 03-ux/01-information-architecture.md (reception dashboard)

## Tasks
- [ ] Calendar views: day, multi-day, week, provider, operatory; per-user default
- [ ] Appointment lifecycle state machine with status events and reasons
- [ ] Availability, blocked time, holiday enforcement, conflict detection and authorized override
- [ ] Scheduler interactions: quick-create, drag-reschedule, resize, keyboard access, optimistic UI with authoritative server conflicts, undo for low-risk reschedule
- [ ] Optimistic-concurrency test: two receptionists cannot silently overwrite each other
- [ ] Check-in flow surfacing critical alerts
- [ ] Planned appointments, waitlist, recall definitions and instances
- [ ] SMS/email reminder pipeline: queue, bounded retries, delivery callbacks, communication history (provider per ADR-011)
- [ ] Reception dashboard (03-ux/01)
- [ ] Performance: schedule p95 < 2 s; drag feedback < 100 ms; conflict response p95 < 500 ms

## Exit criteria
- Reception operates a full fictional day without spreadsheets
- Jalali appointment input round-trips through the expected canonical stored instant
- Cancelled appointment retains slot, reason, and replacement link
