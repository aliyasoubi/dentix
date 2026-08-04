# Monitoring and Observability

## Signals

### Availability and performance

  - API request count, error rate, and latency

  - Browser error rate and core interaction timings

  - Database connections, locks, replication/PITR health, storage

  - Redis and worker queue depth, age, retries, dead jobs

  - Object-storage errors

### Domain health

  - Appointments with invalid lifecycle anomalies

  - Active journeys without next action

  - Lab orders overdue or blocking appointments

  - Reminder delivery failures

  - Unsigned encounters older than threshold

  - Ledger reconciliation failures

  - Outbox events stuck beyond threshold

### Security

  - Authentication failures and unusual patterns

  - MFA failures

  - Permission changes

  - Large or unusual exports

  - Repeated access-denied events

  - Malware scan failures

## Logging

Use structured logs with correlation IDs, actor IDs where safe, entity identifiers, event names, and timing. Never log note text, medical-history answers, full patient names, phone numbers, uploaded document content, tokens, or passwords.

## Tracing

Trace requests across API, database, outbox, worker, and external messaging providers. Sampling must not capture sensitive payloads.

## Alerts

Alerts are actionable, owned, and severity-based. Examples:

  - Production unavailable

  - Database backup failure

  - Outbox/queue delay threatening reminders

  - Financial reconciliation mismatch

  - Elevated authorization failures

  - Object-storage access failure
