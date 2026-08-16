# Execution Plans

The spec (docs/01–06) is organized by domain and outlives any phase. These plans are the thin
execution layer on top of it: each plan states a goal, the spec sections in scope, a task
checklist, and exit criteria taken from `05-quality/03-acceptance-criteria.md` and
`05-quality/04-definition-of-done.md`.

> **A checklist item here is not a work order.** Only the *active* release plan authorizes
> implementation, and only for work that ships as a complete vertical (entered, validated,
> stored, displayed, edited, authorized, tested). Everything else in `docs/` — including the
> architecture documents and the unbuilt items in later plans — describes the long-term target.
> See CLAUDE.md, "What authorizes implementation", for why this is stated so bluntly.
>
> `release-1-foundation.md` is a **Foundation Recovery Sprint**, not a product release: it makes
> the platform trustworthy but delivers no office workflow on its own. The first release an
> office can actually use is Release 1 — Patient Book.

Plans state scope and gates; execution happens as ordered, individually testable vertical
slices defined per release in `../08-implementation/` (workflow, test layers, verification
commands). Plans follow the release roadmap in `01-product/06-product-roadmap.md` (R0–R7), with one
addition: **Release 0.5 — Walking Skeleton**, which proves the highest-risk technical stack
end-to-end before feature work begins. `00-build-sequencing.md` governs what's in scope now versus
deferred to a later release — the architecture docs in `04-architecture/` describe the full target
design, not a Release 1 build list.

Exit gates below quote `01-product/06-product-roadmap.md` exactly rather than re-authoring the
wording — that file is the source of truth for what each release exits to; this table only
sequences the work against it.

| Plan | Release | Exit gate (verbatim from the product roadmap) |
|---|---|---|
| 00-build-sequencing.md | cross-cutting | N/A — sequencing reference, not a release |
| release-0-discovery.md | R0 | Clickable prototype approved by dentist, receptionist, assistant, and office manager |
| release-0.5-walking-skeleton.md | R0.5 (added) | Risk stack proven end-to-end |
| release-1-foundation.md | R1 | Fictional patient data can be managed securely with correct Jalali dates and unambiguous rial/toman amounts |
| release-2-front-office.md | R2 | Reception can operate a full fictional day without spreadsheets |
| release-3-clinical-core.md | R3 | Dentist can document selected common appointment types safely |
| release-4-treatment-continuity.md | R4 | Implant, orthodontic, crown/bridge, and custom workflows have visible next actions |
| release-5-patient-finance.md | R5 | An authorized parallel ledger reconciles exactly with current office records, or fictional reconciliation passes while the Real-Data Authorization Gate remains closed |
| release-6-operational-completeness.md | R6 | Production readiness review passes |
| release-7-pilot.md | R7 | Office approves phased production adoption |

Rules: a release does not start until the previous release's exit gate is signed off; scope
changes require the scope control rule in `01-product/03-scope-and-exclusions.md`; decisions
that contradict an ADR require a replacement ADR. Risks are tracked in `risks.md` and reviewed
at every release boundary.
