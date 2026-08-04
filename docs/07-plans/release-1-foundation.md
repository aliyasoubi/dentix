# Release 1 — Platform Foundation

**Goal:** production-grade platform: identity, permissions, i18n/date/money primitives, patient registry, audit, backups.
**Spec in scope:** 02-requirements/01-patient-management.md, 03-ux/02-design-system.md, 03-ux/03-bilingual-rtl-guidelines.md, 04-architecture/*, 05-quality/01-security-privacy.md

## Tasks
- [ ] Authentication: OIDC, MFA, sessions, lockout, recovery (05-quality/01)
- [ ] Roles, permission families, object-level authorization (01-product/04)
- [ ] Design tokens and Layer-1/Layer-2 components (03-ux/02): patient header, status chip, money display, Persian text field with Latin-name support
- [ ] Jalali/Gregorian adapter hardened: business-date rules for Asia/Tehran, versioned Iranian holiday configuration
- [ ] Iranian utilities: mobile normalization, optional national-code validation, address structure, Persian collation, digit normalization
- [ ] Patient registry: identity, names (native/Latin), contacts, relationships, alerts, documents metadata
- [ ] Patient search with Persian normalization rules (02-requirements/01 Search)
- [ ] Duplicate detection scoring and controlled merge workflow with audit
- [ ] Audit event framework and transactional outbox
- [ ] Automated encrypted backups with PITR; first restore drill into isolated environment
- [ ] Structured logging with redaction rules (06-operations/03)

## Exit criteria (from roadmap R1 + acceptance criteria)
- Fictional patient data managed securely in Persian UI (Latin name field working)
- Same Iranian mobile in 09…/+98…/Persian-digit forms resolves to one canonical search value
- Merge retains source identity; audit trail complete
- Restore drill documented and passed
