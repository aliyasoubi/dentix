# Open Decisions and Discovery Gates

This file lists only unresolved decisions that block implementation or real-data use. Resolved decisions belong in requirements, architecture documents, or ADRs—not here.

## Release 0 discovery gates

| ID | Required decision/output | Owner | Blocks |
|---|---|---|---|
| DISC-001 | Confirm supported browsers, viewport, office hardware, printers, scanner workflow, network conditions, volumes, storage growth, and office hours | Product owner + technical owner | Release 1 exit and performance acceptance |
| DISC-002 | Approve Farsi clinical/administrative terminology and the domain glossary | Clinical approver | User-facing clinical implementation |
| DISC-003 | Approve the default role/permission matrix and separation-of-duty thresholds | Operational + clinical approvers | Authorization seed data |
| DISC-004 | Select the Iranian holiday source, import/update method, and annual owner | Operational approver | Production scheduling |
| DISC-005 | Inventory migration sources and approve field mapping, rejection, deduplication, opening-balance, reconciliation, and cutover rules | Product + operational approvers | Real-data migration |
| DISC-006 | Name product, clinical, operational, privacy, and technical approvers | Product owner | Release 0 exit |

**Partially resolved (2026-08-14):** Ali is confirmed as product owner and the
authority who accepts the walking-skeleton ADRs (ADR-006/007/009/010) —
recorded here and in each ADR's own acceptance checklist. Clinical,
operational, and privacy approvers are not yet named; DISC-006 stays open
until they are. Concentrating every approver role in one person is the
situation R-07 (`07-plans/risks.md`) already tracks, not a new risk.

**DISC-003 progress (2026-08-14):** the default role/permission matrix was
not missing — it has existed in full in `01-product/04-roles-and-permissions.md`
since Release 0 discovery. What DISC-003 actually still needed was the
separation-of-duty half, which had no content anywhere in the docs (`grep`
for "separation of duty" found only this row). Drafted directly into that
file, scoped narrowly to money-handling and access control per convention,
not clinical scope-of-practice.

**Content is now fully decided by Ali:** Reception posts payments by
default; refund, discount, and reversal all require approval on every
transaction with no threshold for now (`*-approval-threshold` configs start
at 0, raisable later once real transaction volume exists to tune against —
he considered real rial figures and chose the simpler always-require rule
instead); eligible approvers are Manager **or System Administrator**, not
Manager alone.

**The one thing still blocking formal closure is procedural, not
content:** DISC-003 needs a named operational and clinical approver (the
same open half of DISC-006) to actually sign off — content readiness
doesn't substitute for that.

## Walking-skeleton decisions

| ADR | Decision | Acceptance gate |
|---|---|---|
| ADR-006 | TypeORM and migration tooling | Migration, mapper, locking, bigint, and registration proofs pass |
| ADR-007 | Self-hosted OIDC provider | MFA/BFF/re-auth/logout and realm-restore proofs pass |
| ADR-008 | Jalali adapter/library | Shared round-trip and ICU cross-check fixtures pass |
| ADR-009 | Persian PDF pipeline | Rendered fixture, resource bound, and stable-hash proofs pass |
| ADR-010 | Hosting/operations model and named operator | Host, TLS deployment, backup/restore, and registry-isolation proofs pass |

A Proposed ADR permits only the explicitly listed Release 0.5 proof. Production feature dependence and production deployment remain blocked until that ADR is Accepted.

## Later decision

ADR-011 selects messaging providers before Release 2 messaging implementation. Sender/template registration begins early because provider onboarding may take time.

## Real-data gate

The independent Real-Data Authorization Gate in `05-quality/01-security-privacy.md` must be approved before any real patient content is copied, imported, scanned, migrated, used for parallel reconciliation, placed in non-production, or processed by a third party.
