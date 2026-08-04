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

  - Money request/response models use integer amountRial values. Optional displayUnit metadata may be RIAL or TOMAN, but it never changes the canonical amount.

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

{  
"code": "APPOINTMENT\_CONFLICT",  
"messageKey": "errors.appointmentConflict",  
"correlationId": "...",  
"details": {  
"conflictingAppointmentIds": \["..."\]  
}  
}

Backend messages are not localized prose. Sensitive details are omitted.

## Pagination

Cursor pagination for timelines, audit, communications, and large lists. Simple bounded configuration lists may use offset pagination.

## Concurrency

Responses include ETag or version. Mutations of versioned drafts require If-Match or the expected version. Conflict returns HTTP 409 or 412 according to the selected convention.

## Idempotency

Create/payment/message endpoints that may be retried accept an idempotency key. The server returns the original result for the same key and equivalent request.

## Security

  - OIDC access token validation

  - Permission and object-level authorization

  - CSRF protection according to token/cookie architecture

  - Rate limits for authentication, search, export, and message endpoints

  - No PHI in URL query values except controlled search terms over TLS; logs redact query values

## Generated client

The Angular client is generated or type-checked from OpenAPI contracts. Handwritten adapters expose domain-friendly client services to UI features.
