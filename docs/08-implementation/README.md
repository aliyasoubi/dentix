# Implementation Layer

The execution home for AI-assisted development. `07-plans/` remains authoritative for release scope and exit gates; this folder defines **how work is executed and proven**:

- `01-workflow.md` — the slice-based TDD loop, test-layer mapping, canonical verification commands, and stop conditions every agent follows.
- `02-slices-release-0.5.md` — the current release broken into ordered, individually testable vertical slices.

One slice file exists per active release, written just-in-time when that release starts. This folder never creates requirements; it only sequences and verifies them (authority order in `document-control.md`).
