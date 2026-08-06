# Release 6 — Operational Completeness

**Goal:** migration tooling, full report suite, print templates, hardening — production readiness.
**Spec in scope:** 02-requirements/08-reporting.md, 02-requirements/07-documents-communications.md, 05-quality/*, 06-operations/*

## Tasks
- [ ] Data import tools for the migration sources inventoried in R0; validation and rejection reporting
- [ ] After the Real-Data Authorization Gate is approved, rehearse migration on the minimum authorized real-data extract in an isolated environment; otherwise use generated migration fixtures
- [ ] Structured full-patient-record export
- [ ] Fixed report suite with documented inclusion logic; async execution for large reports
- [ ] Persian print templates and consent acknowledgment flow with template versioning and hashes
- [ ] Document storage: encrypted objects, malware scanning, immutable signed versions
- [ ] Security hardening: penetration test, ASVS control mapping review, dependency/container/secret scans, SBOM
- [ ] Full restore drill and disaster-recovery exercise against RPO 15 min / RTO 4 h targets
- [ ] Performance tuning against representative data volumes; accessibility audit (WCAG 2.2 AA)
- [ ] Support playbook, admin runbook, staff training material in Persian

## Exit criteria
- Production readiness review passes (all release gates in 06-operations/04)
- Authorized migration rehearsal reconciles; rollback and post-rehearsal deletion plans approved
