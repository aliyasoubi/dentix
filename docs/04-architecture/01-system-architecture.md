# System Architecture

## Architecture style

A modular monolith is the approved starting architecture. It provides strong transactional consistency and simpler deployment while preserving domain boundaries that may later be extracted if justified.

## Runtime view

flowchart LR  
U\[Browser - Angular\] --\>|HTTPS REST/OpenAPI| API\[NestJS API\]  
API --\> DB\[(PostgreSQL)\]  
API --\> OBJ\[Encrypted Object Storage\]  
API --\> REDIS\[(Redis)\]  
REDIS --\> WORKER\[Background Worker\]  
WORKER --\> SMS\[SMS Provider\]  
WORKER --\> EMAIL\[Email Provider\]  
IDP\[OIDC Identity Provider\] --\> U  
IDP --\> API  
API --\> OBS\[Logs Metrics Traces\]

## Deployable units

  - web: Angular static application

  - api: NestJS modular monolith

  - worker: same codebase or separate process for queued jobs

  - PostgreSQL

  - Redis

  - Object storage

  - Reverse proxy or managed ingress

## Module list

  - Identity and access

  - Office administration

  - Patients

  - Scheduling

  - Clinical encounters

  - Odontogram and periodontal charting

  - Procedure catalog

  - Treatment planning

  - Treatment journeys

  - Follow-up and recall

  - Lab orders

  - Patient ledger

  - Documents

  - Communications

  - Reporting

  - Audit

  - Integrations

## Communication rules

  - Modules call application ports, not each other’s repositories.

  - Synchronous use cases handle operations requiring immediate consistency.

  - Domain events trigger secondary work.

  - A transactional outbox stores events atomically with domain changes.

  - Workers process outbox and background jobs idempotently.

## API style

REST with OpenAPI is the primary interface. Resources use stable identifiers, versioned contracts, pagination, filtering, and consistent error codes. WebSocket or server-sent events may be used for schedule updates and notifications, but REST remains authoritative.

## Tenancy and office model

The first product serves one office. Rows include office\_id where appropriate to prevent global singleton assumptions and ease future evolution. Multi-location UX and central billing remain out of scope.

## Availability target

Initial target: business-hours reliability suitable for one office, with documented degraded modes and recovery. The system is not designed as a life-support or emergency-care device.
