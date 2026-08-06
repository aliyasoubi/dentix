# Implementation Checklist

Coarse progress tracker only. Task detail and sequencing are owned by the release plans in `07-plans/` and executed as slices per `08-implementation/`; if this list and a plan disagree, the plan wins.

## Foundation

- [ ] Repository and monorepo conventions
- [ ] Angular Material/CDK theme and tokens
- [ ] Farsi (fa-IR) translation pipeline (ADR-012)
- [ ] RTL and mixed-script utilities
- [ ] Jalali presentation adapter, canonical Gregorian/UTC conversion, and Asia/Tehran business-date rules
- [ ] Iranian mobile, optional national-code, address, and Persian-collation utilities
- [ ] Canonical rial money type and explicit rial/toman input/formatting components
- [ ] NestJS modules and architecture linting
- [ ] PostgreSQL migrations and transaction conventions
- [ ] OIDC, MFA, sessions, permissions
- [ ] Audit and outbox frameworks
- [ ] Backup and monitoring baseline

## Product modules

- [ ] Patient registry and search
- [ ] Scheduling and appointment lifecycle
- [ ] Planned appointments, waitlist, and recall
- [ ] Encounters and clinical notes
- [ ] Odontogram and perio
- [ ] Treatment plans and decisions
- [ ] Treatment journeys and stage templates
- [ ] Follow-up Center
- [ ] Lab orders and readiness
- [ ] Patient ledger and receipts
- [ ] Documents and transactional communication
- [ ] Fixed reports and exports

## Release readiness

- [ ] Persian acceptance suite
- [ ] Jalali round-trip/canonical-date and Iranian holiday suite
- [ ] Rial/toman exactness and unit-label suite
- [ ] Permission matrix test suite
- [ ] Clinical and financial immutability tests
- [ ] Performance tests
- [ ] Accessibility audit
- [ ] Security verification
- [ ] Restore drill
- [ ] Authorized real-data migration rehearsal or generated-fixture rehearsal while the gate remains closed
- [ ] Staff training and rollback plan
