# Dentix — Farsi-First Single-Office Dental PMS

**Dentix** is the product name. This is the docs-as-code implementation baseline.
**The markdown files in `docs/` are the version-controlled source of truth** — see
`docs/document-control.md` for versioning and ownership.

## Layout

```
CLAUDE.md                  AI-assisted development guide (invariants, conventions)
assets/brand/               Dentix logo — icon, EN/FA lockups, monochrome variant
docs/
  README.md                Executive implementation summary
  00-review/               Current architecture readiness review
  01-product/              Vision, scope, roles, traceability, roadmap, glossary, references
  02-requirements/         Functional requirements by domain (+ migration, NFR)
  03-ux/                   Information architecture, Farsi/RTL design, motion/a11y, brand identity
  04-architecture/         00-software-design-document.md  ← start here (standard build reference)
                           System, contexts, transactions/events, data, API, sessions, configuration
    adr/                     Architecture decision records
  05-quality/              Security, test strategy, acceptance criteria, definition of done
  06-operations/           Deployment, backup/recovery, monitoring, release process, checklist
  07-plans/                Execution plans per release (R0 … R7 + added R0.5) and risk register
  08-implementation/       AI execution layer: slice workflow, test layers, per-release testable slices
```

## How to use this package

1. Read `docs/04-architecture/00-software-design-document.md` — the standard entry point: architecture, decisions, and the build order in one file.
2. Read `docs/document-control.md` — authority, ownership, and change rules.
3. Follow `docs/07-plans/README.md` — one plan per release, each with tasks and exit criteria — and execute each release as the testable slices in `docs/08-implementation/`.
4. Put this directory at the root of the product git repository so spec changes ride in the same PRs as code.
5. Decisions that contradict an accepted ADR require a replacement ADR.

Version 0.4.1 · Baseline 2026-08-06
