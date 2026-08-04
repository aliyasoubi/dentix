# Release Process

## Branching and change control

Use short-lived branches, protected main, mandatory review, automated checks, and traceability from requirement to pull request and release note.

## Versioning

Use semantic versioning for the product API and release artifacts. Database migrations have immutable identifiers.

## Release gates

  - Product acceptance criteria approved

  - Security and dependency scans pass

  - Architecture boundary checks pass

  - Database migration reviewed

  - English and Persian critical end-to-end suites pass

  - Visual regression reviewed for custom dental components and printed documents

  - Backup and rollback readiness confirmed

  - Training and support notes prepared

## Pilot rollout

97. Internal fictional-data testing

98. Selected staff with non-production data

99. Parallel workflow with controlled real patients if legally approved

100. Read-only verification of migrated history

101. Limited production modules

102. Expand only after reconciliation and user sign-off

## Incident response during release

Define a release commander, technical owner, clinical/office approver, rollback trigger, and communication channel. Never continue deployment merely to meet a schedule when clinical or ledger integrity is uncertain.

## Post-release review

Review defects, user friction, performance, support tickets, security events, and whether the release achieved its user outcome. Update ADRs and roadmap where learning changes the design.
