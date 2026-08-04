# Release 4 — Treatment Continuity

**Goal:** treatment planning, journeys, follow-up tasks, and lab orders make the next action always visible.
**Spec in scope:** 02-requirements/04-treatment-planning.md, 02-requirements/05-journeys-followup-labs-recall.md

## Tasks
- [ ] Procedure and fee catalog with bilingual translation rows and effective-dated fees
- [ ] Versioned treatment plans: phases, items, alternatives, immutable presented snapshots
- [ ] Patient decision recording; decision reversal as new event
- [ ] Plan → planned/booked appointment handoff without re-entry
- [ ] Treatment journeys with implant, orthodontic, prosthetic, and custom templates
- [ ] Journey invariant: every active journey has a future appointment or open task, or an explicit exception with review date
- [ ] Follow-up tasks and Follow-up Center with all specified views
- [ ] Lab orders: lifecycle, revisions, quality-checked Ready state, appointment readiness warnings and overrides
- [ ] Event-driven task automation (visible, idempotent, auditable, suppressible)
- [ ] Unscheduled accepted-treatment queue
- [ ] Persian plan printout (ADR-012)

## Exit criteria
- Implant, ortho, crown/bridge, and custom workflows show visible next actions
- Editing a draft plan never changes a presented version
- Schedule warns when a dependent lab order is not Ready
