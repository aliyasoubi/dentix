# Implementation Layer

The execution home for AI-assisted development. `07-plans/` remains authoritative for release scope and exit gates; this folder defines **how work is executed and proven**:

- `01-workflow.md` — the slice-based TDD loop, test-layer mapping, canonical verification commands, and stop conditions every agent follows.
- `02-slices-release-0.5.md` — Release 0.5's slices. **Historical**: that release is functionally complete.

The **active** contract is `../07-plans/release-1-patient-book.md` (Release 1 — Patient Book).
Its slice file will be written when the first slice starts; until then the contract itself is
the authority on scope, and nothing else in `docs/` authorizes implementation.

One slice file exists per active release, written just-in-time when that release starts. This folder never creates requirements; it only sequences and verifies them (authority order in `document-control.md`).
