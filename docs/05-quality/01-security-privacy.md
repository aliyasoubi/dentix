# Security and Privacy Requirements

## Governance

Before production use, the office must identify the applicable jurisdiction and complete a documented privacy and security risk assessment. This package is an engineering baseline, not legal advice.

## Real-Data Authorization Gate

No real patient data may be copied, exported, imported, scanned, migrated, used for a parallel ledger, placed in staging, or processed by a third party until this gate is approved. Pseudonymized data remains real data unless the approved reviewer determines that re-identification is not reasonably possible.

The gate requires:

1. Named data controller/product owner, privacy approver, technical custodian, and incident contact.
2. Applicable jurisdiction, retention duties, patient-access/correction rules, and legal-hold behavior.
3. Accepted hosting model and approved locations for database, object storage, backups, identity, monitoring, and support access.
4. Approved migration purpose, source inventory, minimum necessary fields, access list, transfer method, deletion schedule, and reconciliation procedure.
5. Approved providers and contracts for any party processing patient data.
6. Encryption/key custody, backup recovery, breach response, audit access, and staff confidentiality controls.
7. Written approval identifying the permitted environments, data set, time window, and responsible operator.

Release 0 discovery may inspect workflows and record source metadata without copying patient content. Development, automated tests, demos, screenshots, and routine staging use deterministic fictional data until the gate explicitly permits otherwise.

## Identity

  - OIDC-backed backend-for-frontend session per `04-architecture/09-authentication-session-architecture.md`
  - MFA for all users with patient access
  - Angular stores no access or refresh tokens; provider-token retention is deferred per ADR-014
  - Secure recovery and administrative reset process
  - Active-session visibility and revocation
  - Account lockout/throttling without enabling denial-of-service abuse

## Authorization

  - Least privilege
  - Endpoint and object-level checks
  - Separate system administration from clinical access
  - Recent-authentication requirement for signing, exports, and high-risk finance actions
  - Permission changes audited

## Data protection

  - TLS for all network traffic
  - Encryption at rest for database volumes, backups, and object storage
  - Central secret manager
  - No production patient data in development or test
  - No secrets or PHI in source control
  - Sensitive log redaction

## Audit

Audit at minimum:

  - Authentication and session events
  - Patient record view where policy requires
  - Clinical sign/amend/entered-in-error
  - Patient merge and export
  - Appointment overrides
  - Journey/lab critical state changes
  - Ledger postings, refunds, reversals, and day close
  - User, role, and permission changes
  - Backup and restore operations

Audit data is append-only to ordinary application users and protected from tampering.

## Application security

  - Validate all input at trust boundaries
  - Parameterized database access
  - Output encoding and CSP
  - Session-bound CSRF defense on unsafe requests
  - Secure file-upload scanning and content validation
  - SSRF protection for external URL features
  - Rate limiting and abuse detection
  - Dependency, container, IaC, and secret scanning
  - Software bill of materials
  - Regular patch process

## Backup security

Backups are encrypted, access-controlled, monitored, and tested. Restore operations occur into an isolated environment first unless emergency procedure dictates otherwise.

## Privacy behavior

  - Collect only operationally necessary data
  - Configurable retention according to law and office policy
  - Data export is controlled and audited
  - Screen privacy: avoid exposing sensitive data in notifications and list views
  - Support corrected demographics while preserving clinical authorship history

## Verification baseline

Use OWASP ASVS as the verification framework and maintain a project-specific control mapping.
