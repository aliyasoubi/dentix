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
