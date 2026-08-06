# Execution Plans

The spec (docs/01–06) is organized by domain and outlives any phase. These plans are the thin
execution layer on top of it: each plan states a goal, the spec sections in scope, a task
checklist, and exit criteria taken from `05-quality/03-acceptance-criteria.md` and
`05-quality/04-definition-of-done.md`.

Plans state scope and gates; execution happens as ordered, individually testable vertical
slices defined per release in `../08-implementation/` (workflow, test layers, verification
commands). Plans follow the release roadmap in `01-product/06-product-roadmap.md` (R0–R7), with one
addition: **Release 0.5 — Walking Skeleton**, which proves the highest-risk technical stack
end-to-end before feature work begins.

| Plan | Release | Exit gate |
|---|---|---|
| release-0-discovery.md | R0 | Clickable prototype approved by office staff |
| release-0.5-walking-skeleton.md | R0.5 (added) | Risk stack proven end-to-end |
| release-1-foundation.md | R1 | Fictional patients managed securely in Farsi/RTL |
| release-2-front-office.md | R2 | Reception runs a full fictional day without spreadsheets |
| release-3-clinical-core.md | R3 | Dentist documents common appointment types safely |
| release-4-treatment-continuity.md | R4 | Long-running care has visible next actions |
| release-5-patient-finance.md | R5 | Authorized parallel or fictional ledger reconciliation passes |
| release-6-operational-completeness.md | R6 | Production readiness review passes |
| release-7-pilot.md | R7 | Office approves phased production adoption |

Rules: a release does not start until the previous release's exit gate is signed off; scope
changes require the scope control rule in `01-product/03-scope-and-exclusions.md`; decisions
that contradict an ADR require a replacement ADR. Risks are tracked in `risks.md` and reviewed
at every release boundary.
