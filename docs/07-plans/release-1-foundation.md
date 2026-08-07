# Release 1 — Platform Foundation

**Goal:** the minimal practical foundation: identity, permissions, i18n/date/money primitives, patient registry, audit, backups. Scope is deliberately smaller than the full architecture — see `00-build-sequencing.md`.
**Spec in scope:** 02-requirements/01-patient-management.md, 03-ux/02-design-system.md, 03-ux/03-bilingual-rtl-guidelines.md, 04-architecture/*, 05-quality/01-security-privacy.md, 00-build-sequencing.md

## Tasks
- [ ] Authentication: OIDC, MFA, sessions, lockout, recovery (05-quality/01)
- [ ] Roles, permission families, object-level authorization (01-product/04)
- [ ] Design tokens and the first five or six shared components in Storybook (03-ux/02): patient header, status chip, money display, Persian text field with Latin-name support
- [ ] Jalali adapter and canonical conversion hardened: business-date rules for Asia/Tehran and versioned Iranian holiday configuration
- [ ] Iranian utilities: mobile normalization, optional national-code validation, address structure, Persian collation, digit normalization
- [ ] Patient registry: identity, names (native/Latin), contacts, relationships, alerts, documents metadata
- [ ] Patient search with Persian normalization rules (02-requirements/01 Search)
- [ ] Duplicate detection scoring and alias/source-freeze merge only (00-build-sequencing.md); full module-coordinated merge is Release 4
- [ ] Audit event framework and transactional outbox (no consumer platform around it yet)
- [ ] Automated encrypted backups; PITR and RPO 15-minute/RTO 4-hour targets are the pre-pilot gate (00-build-sequencing.md, Release 6 plan), not required here
- [ ] Structured logging with redaction rules (06-operations/03)

## Exit criteria (from roadmap R1 + acceptance criteria)
- Fictional patient data managed securely in Persian UI (Latin name field working)
- Same Iranian mobile in 09…/+98…/Persian-digit forms resolves to one canonical search value
- Merge retains source identity; audit trail complete
- A basic backup restores successfully once (the full PITR/RPO-validated drill is the pre-pilot gate, not required here)
