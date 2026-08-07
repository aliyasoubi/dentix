# Integration Event Catalog

This document is authoritative for the full target set of cross-module event contracts. It is not a Release 1 build list: each row is implemented only when the release that needs its consumer arrives — see `07-plans/00-build-sequencing.md`. Transport mechanics, ordering, retry, replay, and gap handling are defined in `08-transaction-event-semantics.md`.

Every event uses the standard envelope and adds only the minimum listed payload. Adding a field is backward-compatible; removing/changing meaning requires a new `eventVersion`. Patient names, contact destinations, clinical prose, document content, and credentials are never event payloads.

| Event | Producer | Required consumers | Minimum v1 payload |
|---|---|---|---|
| `PatientCreated.v1` | Patients | Reporting | `patientId`, `patientNumber` |
| `PatientMergeRequested.v1` | Patients | Scheduling, Clinical, Treatment Planning, Treatment Continuity, Laboratory, Patient Finance, Documents, Communications, Reporting | `operationId`, `sourcePatientId`, `destinationPatientId`, `participantSetVersion` |
| `PatientMergeParticipantFinished.v1` | Merge participant | Patients | `operationId`, `participant`, `result`, `handledRecordCount`, `errorCode?` |
| `AppointmentLifecycleChanged.v1` | Scheduling | Clinical, Treatment Continuity, Communications, Reporting | `appointmentId`, `patientId`, `previousState`, `newState`, `startAt`, `providerId`, `reasonCode?`, `replacementAppointmentId?` |
| `RecallBecameDue.v1` | Scheduling | Treatment Continuity, Communications, Reporting | `recallInstanceId`, `patientId`, `dueDate`, `communicationPolicyCode` |
| `EncounterSigned.v1` | Clinical | Documents, Reporting | `encounterId`, `patientId`, `providerId`, `signedAt`, `contentHash` |
| `ProcedureCompleted.v1` | Clinical | Treatment Planning, Treatment Continuity, Patient Finance, Reporting | `procedureRecordId`, `patientId`, `encounterId`, `appointmentId?`, `treatmentPlanItemId?`, `journeyId?`, `procedureCodeSnapshot`, `anatomy`, `completedAt` |
| `TreatmentPlanPresented.v1` | Treatment Planning | Documents, Reporting | `planId`, `planVersionId`, `patientId`, `presentedAt`, `contentHash`, `displayUnit` |
| `TreatmentDecisionRecorded.v1` | Treatment Planning | Scheduling, Treatment Continuity, Reporting | `planId`, `planVersionId`, `itemId`, `patientId`, `decision`, `decidedAt` |
| `JourneyStageChanged.v1` | Treatment Continuity | Laboratory, Communications, Reporting | `journeyId`, `patientId`, `previousStage`, `newStage`, `changedAt`, `nextActionDueDate?` |
| `FollowUpTaskChanged.v1` | Treatment Continuity | Communications, Reporting | `taskId`, `patientId`, `previousState`, `newState`, `dueAt?`, `assigneeType`, `assigneeId?` |
| `LabOrderStatusChanged.v1` | Laboratory | Scheduling, Treatment Continuity, Communications, Reporting | `labOrderId`, `patientId`, `previousState`, `newState`, `expectedDate?`, `readyAt?`, `linkedAppointmentIds` |
| `LedgerEntryPosted.v1` | Patient Finance | Documents, Reporting | `ledgerEntryId`, `patientId`, `entryType`, `amountRial`, `businessDate`, `sourceType`, `sourceId?`, `originalEntryId?` |
| `ReceiptStateChanged.v1` | Patient Finance | Documents, Reporting | `receiptId`, `patientId`, `state`, `receiptNumber`, `contentHash`, `issuedAt`, `displayUnit` |
| `DocumentStateChanged.v1` | Documents | Reporting | `documentId`, `patientId`, `category`, `previousState`, `newState`, `versionId?`, `contentHash?` |
| `CommunicationRequested.v1` | Scheduling, Treatment Continuity, Laboratory, authorized application command | Communications | `intentId`, `patientId`, `intentType`, `templateCode`, `sourceType`, `sourceId`, `notBefore?` |
| `CommunicationStatusChanged.v1` | Communications | Reporting | `communicationId`, `patientId`, `previousState`, `newState`, `channel`, `safeErrorCode?` |
| `PermissionVersionChanged.v1` | Identity and Access | Session/cache invalidation, Audit projection | `officeUserId`, `newPermissionVersion`, `highRiskChange` |
| `OfficePolicyChanged.v1` | Office Administration | Affected cache/projection owners | `policyType`, `policyVersion`, `effectiveAt` |

## Contract rules

1. The producer owns the event name, schema, and compatibility tests.
2. Required consumers and their minimum terminal result are version-controlled; adding a required merge participant changes the participant-set version.
3. Consumers use identifiers to load authorized/current facts only when their handler contract permits it; an event is not a general data-access grant.
4. Monetary values are decimal strings containing integer rials. Dates are Gregorian ISO dates; instants are RFC 3339 UTC timestamps.
5. A consumer persists its authoritative write and processed-event record in one transaction.
6. External side effects require a domain idempotency key derived from the source intent, not from queue delivery attempt.
7. Contract fixtures are shared between producer and consumer tests. When implementation begins, machine-readable schemas live under `contracts/events/<event>/<version>.schema.json` and CI checks them against this catalog.

## Consumer outcomes

Handlers return one of: `APPLIED`, `ALREADY_APPLIED`, `NOT_APPLICABLE`, `DEFERRED_GAP`, `RETRYABLE_FAILURE`, or `FINAL_FAILURE`. `FINAL_FAILURE` is never silently acknowledged; it creates an operational exception and, for a process manager, prevents successful completion until an authorized resolution is recorded.
