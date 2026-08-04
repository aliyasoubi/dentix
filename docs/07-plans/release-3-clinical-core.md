# Release 3 — Clinical Core

**Goal:** dentists document encounters safely: histories, notes, odontogram, perio, timeline.
**Spec in scope:** 02-requirements/03-clinical-charting.md, 05-quality/03 (clinical), ADR-004

## Tasks
- [ ] Encounter model and states (Draft → Signed → Amended / Entered in error)
- [ ] Clinical notes: autosave drafts, explicit signing with recent-authentication, immutable signed text, amendments
- [ ] Versioned medical/dental history; encounter records reviewed version
- [ ] SVG odontogram: permanent/primary/mixed dentition, FDI + Universal display over stable internal identifiers, tooth- and surface-level states
- [ ] Golden-fixture tests for tooth/surface mappings; visual regression for the odontogram
- [ ] Periodontal chart: six sites per tooth, keyboard-first entry, comparison with previous exams
- [ ] Procedure completion flow with validations and optional draft charge hook (config; ledger lands in R5)
- [ ] Clinical timeline read model
- [ ] Concurrency: visible conflicts; explicit handling when switching patients with unsaved drafts

## Exit criteria
- Dentist documents selected common appointment types safely
- Signed notes cannot be edited; amendments retain originals
- Tooth/surface mapping correct in both numbering systems
