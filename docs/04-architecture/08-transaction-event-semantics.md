# Transaction and Event Semantics

This document defines consistency, transaction, outbox, retry, and failure behavior across modules.

## Core rule

A command transaction mutates authoritative state in one owning module. The same PostgreSQL transaction also appends its outbox events and required audit facts. Another module's repository is never enlisted in that transaction.

Cross-module behavior uses one of three patterns:

1. **Synchronous fact check:** a narrow port is called before commit when the command cannot be valid without current external facts.
2. **Integration event:** secondary work occurs after commit and may be temporarily pending.
3. **Process manager:** a durable multi-step business process coordinates several module commands and records progress, timeout, and compensation.

## Consistency matrix

| Workflow | Authoritative transaction | Secondary behavior | Consistency |
|---|---|---|---|
| Create or reschedule appointment | Scheduling writes appointment and status event after availability/conflict checks | Reminder rescheduling, follow-up projections, audit | Appointment commit is synchronous; secondary work is eventual |
| Sign encounter | Clinical writes immutable signed version and audit fact | Timeline/report projection | Signature is synchronous; projections are eventual |
| Complete procedure | Clinical writes procedure completion | Treatment-plan progress, journey progress, optional draft charge | Clinical fact is synchronous; downstream updates are eventual and visibly pending on failure |
| Present treatment plan | Treatment Planning snapshots catalog labels and fees before commit | Document generation and reporting | Snapshot is synchronous; generated document is eventual |
| Mark lab order ready | Laboratory writes quality check and readiness event | Scheduling readiness projection and notification | Lab state is synchronous; schedule projection is eventual |
| Post payment or reversal | Patient Finance writes immutable ledger entries, allocations, and audit fact | Receipt generation and reporting | Ledger balance is synchronous; documents/reports are eventual |
| Patient merge | Patient Registry process manager establishes canonical mapping and freezes source writes | Each module acknowledges merge handling | Multi-step process; immutable history is not rewritten |
| Send message | Communications records one message intent | Integration worker delivers and records attempts/callbacks | Intent is synchronous; delivery is eventual |

## Patient merge process

A patient merge is not a single transaction spanning every module.

1. Patient Registry validates source/destination, creates `patient_merge_operation`, marks the source `MERGING`, creates the canonical alias mapping, and emits `PatientMergeRequested` in one transaction.
2. New writes using the source identifier are rejected and redirected to the destination identifier.
3. Each affected module handles the event idempotently. Mutable active records may be relinked through that module's command. Signed clinical records and posted ledger entries retain their original patient identifier and resolve through the canonical alias.
4. Each module emits `PatientMergeModuleCompleted` or `PatientMergeModuleFailed`.
5. The process manager marks the merge `COMPLETED` only after all required modules acknowledge it. Failures remain visible and retryable; automatic rollback of already completed module steps is not attempted.
6. Reads during the process show a union under the destination record and display a merge-in-progress indicator to authorized users.

## Procedure completion process

`ProcedureCompleted` is a clinical fact and is never rolled back because a downstream handler failed.

- Treatment Planning idempotently marks the linked plan item completed when the link and current state permit it.
- Treatment Continuity evaluates stage/next-action rules and records any automatic change with its source event.
- Patient Finance creates at most one draft charge when office policy enables it.
- A failed handler is retried; after the retry limit it enters the dead-letter queue and creates an operational alert. The patient timeline displays the completed procedure immediately and any failed automation as pending staff attention.

## Event envelope

Every integration event contains:

```text
eventId             UUID, globally unique
eventType           stable English name
eventVersion        positive integer
occurredAt          UTC timestamp
officeId            office scope
aggregateType       owning aggregate type
aggregateId         owning aggregate identifier
aggregateVersion    version after the committed change
actorId             user/service actor when applicable
correlationId       originating request or process
causationId         command/event that caused this event
payload             versioned, minimum necessary data
```

Events contain identifiers and safe business facts, not note text, medical-history answers, credentials, or full document content.

## Outbox delivery

- `outbox_event` is appended with the domain transaction.
- A publisher claims rows using `FOR UPDATE SKIP LOCKED`, publishes them to BullMQ, and records attempts and publication time.
- Delivery is **at least once**. Exactly-once delivery is not claimed.
- Ordering is guaranteed only per aggregate through `aggregateVersion`; consumers must reject or defer gaps where ordering matters.
- Consumers record `(consumerName, eventId)` in `processed_event`; the unique key makes handling idempotent.
- Retries use bounded exponential backoff. Exhausted work moves to a dead-letter queue and raises an alert.
- Replay is an explicit administrative operation, audited and limited by event type/time range.

## Idempotent commands

Retryable create, payment, reversal, export, and message commands require an idempotency key scoped to office, authenticated actor, route, and request hash. Reusing a key with a different request returns `IDEMPOTENCY_KEY_REUSED` and does not execute the command.

## Failure and reconciliation

Every process manager and event handler exposes status, last error code, attempt count, and next retry time. Scheduled reconciliation checks detect stuck outbox rows, missing aggregate versions, incomplete patient merges, procedure completions without expected reactions, and delivery callbacks that cannot be matched.
