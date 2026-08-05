# Design Review — Gap Analysis and Improvement Plan

**Reviewed:** Dentix specification v0.2.0 (baseline 2026-08-02)
**Review date:** 2026-08-03
**Verdict:** Strong baseline — clear scope with explicit exclusions, ADR discipline, RFC 2119 requirements, and correct early treatment of the two hardest problems (Jalali/RTL and rial/toman with immutable records). The gaps below are what stands between a good specification and a buildable project. Each gap states what was found, why it matters, and what was done or should be done.

---

## A. Critical unmade decisions (blockers before feature work)

The baseline defines contracts but not implementations for several foundational choices. Each now has a Proposed ADR stub that must be accepted during Release 0.5 (walking skeleton).

| # | Gap | Why it matters | Action taken |
|---|---|---|---|
| A1 | No ORM / migration toolchain chosen | Mapper-isolation rules, append-only tables, and bigint money constrain the choice; retrofitting is expensive | ADR-006 stub with options and decision drivers |
| A2 | No OIDC identity provider chosen | Foreign SaaS IdPs are unreliable/unavailable for domestic Iranian operation; self-hosting (e.g., Keycloak) has real ops cost | ADR-007 stub |
| A3 | No Jalali calendar library / Angular DateAdapter chosen | ADR-005 defines the contract only; this touches every date control in the app | ADR-008 stub + required round-trip proof in walking skeleton |
| A4 | No PDF/print pipeline chosen | Persian shaping, bidi, and font embedding fail in most lightweight PDF libs; receipts and consents depend on it | ADR-009 stub + dummy-receipt proof in walking skeleton |
| A5 | **Hosting model undecided — biggest gap in the document.** The deployment guide says how to deploy but never where, or who operates it | RPO 15 min / RTO 4 h is unverifiable; sanctions constrain foreign cloud; office internet reliability decides on-prem vs domestic VPS; "who is on call" is unanswered | ADR-010 stub; blocking gate for walking-skeleton deployment |
| A6 | No SMS/email provider chosen | Iranian SMS panels need sender-ID registration and template pre-approval with lead time | ADR-011 stub, due at Release 2 planning |
| A7 | Procedure code catalog origin undefined | The spec references ISO 3950 for teeth but not where procedure codes come from; licensed sets (e.g., CDT) may not be usable | Recommend: office-defined internal catalog with stable codes (structure already specified); record as note in ADR backlog |

## B. Specification gaps (missing or underspecified content)

| # | Gap | Why it matters | Action taken |
|---|---|---|---|
| B1 | **Data migration is nearly unspecified** — mentioned only in R0 discovery and R6 "import tools", yet the office's existing spreadsheets/paper records must become opening balances and history | Migration quality failures surface at pilot, the worst possible time; opening balances interact with ledger immutability (you cannot "fix" bad posted entries casually) | New spec stub `02-requirements/09-data-migration.md` with opening-balance rule, dedup pass, rehearsal, and cutover requirements; risk R-05 |
| B2 | Non-functional requirements are scattered and incomplete: no browser support matrix, no capacity/volume assumptions, no office-hours availability window, no degraded-mode/paper-fallback procedure | Performance tests need target volumes; "business-hours reliability" is untestable as written; an office with no internet must know what to do | New spec stub `02-requirements/10-non-functional-requirements.md` with proposed values to confirm in R0 |
| B3 | Requirements have no stable IDs | MUST-statements can't be traced to tests or PRs; the DoD requires "requirement approved" but nothing is addressable | Recommend: assign IDs per domain (PAT-001, SCH-001…) during R0; low-cost, high-payoff |
| B4 | Iranian holiday data source undefined ("versioned configuration" but from where?) | Official Iranian holidays partly depend on lunar calendar and yearly announcements; someone must own the update process | Recommend: yearly manual import task owned by office manager, versioned in config; note added to R1 plan (holiday configuration) |
| B5 | Offline/connectivity behavior unaddressed | Browser app + (possibly remote) server: reception must have a defined fallback when connectivity drops mid-day | Folded into B2 stub (degraded modes) and ADR-010 decision drivers |
| B6 | Anonymization process for staging "approved anonymized data" referenced but never defined | Without a defined process the rule becomes "no realistic staging data at all" or, worse, quiet copying | Recommend: define during R6; until then staging uses generated fictional data only |

## C. Process and planning gaps

| # | Gap | Why it matters | Action taken |
|---|---|---|---|
| C1 | No walking-skeleton milestone — roadmap jumps from prototype (R0) to full platform (R1) | The five riskiest technologies (RTL Material, Jalali adapter, OIDC, print pipeline, hosting) would first meet reality mid-R1 under feature pressure | Added `07-plans/release-0.5-walking-skeleton.md` gating R1 |
| C2 | No risk register | Governance reviews approvals but nothing tracks likelihood/impact/mitigation over time | Added `07-plans/risks.md` (14 risks) with release-boundary review rule |
| C3 | No estimates, team-size assumptions, or timeline | R0–R7 with this scope is plausibly 12–24+ months for a small team; the office should see that before committing; governance sign-offs assume people who must be named | Recommend: after R0, estimate per release and name the package owner (currently "To be assigned" in document-control) |
| C4 | Historical spec was a single master document; content now lives entirely in markdown | The Markdown files under `docs/` are the sole, version-controlled source of truth — no separate master document exists to keep in sync | This repository structure; `document-control.md` retained |
| C5 | Training/change management thin (one bullet in R6/R7) | Reception adoption decides pilot success as much as code quality | Added training tasks to R6/R7 plans; risk R-11 (pilot fatigue) |
| C6 | Governance requires dentist/manager/legal approvals but no named people or cadence | Unowned approvals become bottlenecks discovered at gate time | Recommend: name approvers in `document-control.md` at R0 exit; legal sign-off tracked as risk R-13 and hard R7 entry gate |

## D. Minor observations (fine as-is, worth noting)

1. Stack versions (Angular 22, Node 24 LTS, PostgreSQL 18) are current as of the baseline — pin exact patches in-repo (risk R-12).
2. The five-concept core model (plan / journey / task / lab order / recall) is the best idea in the document — resist any future pressure to add per-specialty modules; the traceability matrix already defends this.
3. The rial/toman "no silent rounding" rule and the bigint-rial mandate are exactly right; the property-based test requirement in the test strategy is the correct enforcement — keep it a release gate.
4. Formatting artifacts from the original document split (continuous list numbering across sections, unfenced diagrams/code, escaped characters) have been cleaned up across `docs/`.

## Priority order to act

1. Accept ADR-010 (hosting) — it shapes everything operational.
2. Run Release 0 discovery including the migration source inventory (B1) and NFR confirmation (B2).
3. Build the walking skeleton (C1), accepting ADR-006/007/008/009 with proofs.
4. Assign requirement IDs (B3) and named approvers (C6) before R1 feature work.
5. Keep `risks.md` reviewed at each release boundary.
