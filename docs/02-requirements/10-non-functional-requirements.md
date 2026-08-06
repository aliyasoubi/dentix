# Non-Functional Requirements

These are the implementation baseline. Release 0 confirms the supported office environment and records any approved exception.

## Performance

- Daily schedule initial visible content: p95 under 2 seconds.
- Appointment conflict response after save: p95 under 500 ms, excluding external providers.
- Local drag feedback: under 100 ms.
- Returning-patient registration and scheduling workflow: under 45 seconds for a trained receptionist.
- Common restoration finding plus treatment-plan item: no more than 10 intentional interactions.
- Patient search: p95 under 750 ms at design capacity.
- Ordinary API commands: p95 under 750 ms at design capacity, excluding document generation and external delivery.

Measurements use the agreed office hardware/network and representative fictional data before the real-data gate; production SLOs use privacy-approved telemetry without patient content.

## Design capacity

- 15 concurrent authenticated users with headroom to 30.
- 50,000 patients.
- 1,000,000 appointments and status events.
- 2,000,000 clinical/financial timeline events.
- 10 years of online operational history.
- Document storage is sized from the Release 0 source inventory plus three years of forecast growth.

Capacity tests prove critical queries at these volumes. These numbers are sizing targets, not product licensing limits.

## Availability and recovery

- Business-hours availability target: 99.5% per calendar month, excluding approved maintenance.
- Planned maintenance occurs outside documented office hours with advance notice.
- Initial recovery targets: RPO 15 minutes and RTO 4 hours; ADR-010 must confirm they are achievable.
- Backup success is monitored daily; restore exercises follow `06-operations/02-backup-recovery.md`.

## Connectivity and degraded mode

v1 has no offline write mode and no service-worker cache of patient records. When connectivity or the server is unavailable:

1. The UI shows a persistent unavailable/read-only state and stops new authoritative writes.
2. Clinical or financial content is not stored in browser local/session storage.
3. Staff follow an approved paper downtime procedure containing the minimum necessary information.
4. Recovery uses a controlled reconciliation queue; downtime entries are re-entered by an authorized user with source/time attribution and duplicate checks.
5. The incident and reconciliation completion are audited.

The hosting decision must account for office internet reliability and provide the printed downtime forms/runbook before pilot.

## Supported client environment

- Desktop/laptop browsers are primary; clinically useful tablet layouts are supported where specified.
- The release record lists tested browser versions and operating systems supported by the pinned Angular release.
- The office hardware baseline records minimum viewport, CPU/memory, network latency, receipt/document printers, scanner workflow, and display scaling.
- Critical workflows support keyboard operation, 200% browser zoom, and the accessibility baseline.

## Security and privacy

- Real data is prohibited until the Real-Data Authorization Gate is approved.
- No patient content, credentials, or tokens in logs, URLs, source control, analytics, traces, or crash reports.
- Security verification follows the project ASVS mapping and accepted session architecture.
- Retention and legal-hold periods are configured only after jurisdiction-specific approval.

## Data integrity

- Money calculations are exact integer-rial operations.
- Jalali presentation round-trips to the expected canonical Gregorian/UTC value.
- Signed clinical records and posted financial entries are immutable at application and database layers.
- Every retryable external or cross-module operation is idempotent and reconciled.
- Backup/restore validation includes referential integrity, audit continuity, ledger totals, document-object availability, and outbox/process-manager state.
