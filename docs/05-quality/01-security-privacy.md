# Security and Privacy Requirements

## Governance

Before production use, the office must identify the applicable jurisdiction and complete a documented privacy and security risk assessment. This package is an engineering baseline, not legal advice.

## Identity

  - OIDC/OAuth 2.0 based authentication

  - MFA for all users with patient access

  - Short-lived access tokens or secure server sessions

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

  - CSRF defense according to authentication design

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
