# API Guidelines

## Style

  - REST over HTTPS
  - JSON UTF-8
  - OpenAPI generated and checked in CI
  - URL prefix /api/v1
  - Stable UUID identifiers
  - RFC 3339 timestamps
  - IANA timezone identifiers

## Iranian locale contract

  - API timestamps use RFC 3339 and UTC offsets; date-only values use Gregorian ISO YYYY-MM-DD.
  - The API does not persist Jalali date strings as domain dates. Clients convert at an explicit application boundary.
  - The office timezone is returned as the IANA identifier Asia/Tehran by default.
  - Iranian phone numbers are accepted in common display forms and normalized for search.
  - Money request/response models use decimal-string `amountRial` values so JavaScript clients never lose integer precision. Optional `displayUnit` metadata may be `RIAL` or `TOMAN`, but it never changes the canonical amount.

## Resource examples

  - GET /api/v1/patients?query=
  - POST /api/v1/patients
  - GET /api/v1/patients/{patientId}
  - POST /api/v1/appointments
  - POST /api/v1/appointments/{id}/transitions
  - POST /api/v1/encounters/{id}/sign
  - POST /api/v1/clinical-notes/{id}/amendments
  - POST /api/v1/treatment-plans/{id}/versions
  - POST /api/v1/treatment-journeys/{id}/stage-transitions
  - POST /api/v1/follow-up-tasks/{id}/complete
  - POST /api/v1/lab-orders/{id}/transitions
  - POST /api/v1/patients/{id}/ledger-entries
  - POST /api/v1/ledger-entries/{id}/reversals

## Commands versus direct updates

Use action or transition endpoints for domain state changes. Avoid generic PATCH for signed notes, appointment lifecycle, lab readiness, journey stages, and ledger corrections.

## Errors

```json
{
  "code": "APPOINTMENT_CONFLICT",
  "messageKey": "errors.appointmentConflict",
  "correlationId": "...",
  "details": {
    "conflictingAppointmentIds": ["..."]
  }
}
```

Backend messages are not localized prose. Sensitive details are omitted.

## Pagination

Cursor pagination is used for timelines, audit, communications, and large lists. A cursor encodes the stable sort key plus unique ID, is opaque to clients, and cannot change inclusion filters. Simple bounded configuration lists may use offset pagination.

## Concurrency

Responses include `ETag`. Mutations of versioned records require `If-Match`; a stale/missing precondition returns HTTP 412. HTTP 409 is reserved for current domain-state conflicts such as appointment overlap, duplicate reversal, or an invalid transition.

## Idempotency

Retryable create, payment, reversal, export, and message commands require an idempotency key. Scope, request hashing, reuse errors, and persistence follow `08-transaction-event-semantics.md`.

## Security

  - OIDC-backed server session defined in `09-authentication-session-architecture.md`; browser tokens are not stored by Angular
  - Permission and object-level authorization
  - Session-bound CSRF token on every unsafe request
  - Rate limits for authentication, search, export, and message endpoints
  - No PHI in URL query values except controlled search terms over TLS; logs redact query values

## Generated client

The Angular client is generated or type-checked from OpenAPI contracts. Handwritten adapters expose domain-friendly client services to UI features.

OpenAPI represents `amountRial` as a string with a decimal-integer pattern. The client adapter converts it to `bigint` and never to JavaScript `number` for arithmetic.

## Asynchronous operations

Report generation, export, document rendering, and other long work return HTTP 202 with a job resource. Job resources expose stable state, safe error code, creation/expiry times, and a permission-checked result link. Polling is authoritative; optional server events only improve responsiveness.
