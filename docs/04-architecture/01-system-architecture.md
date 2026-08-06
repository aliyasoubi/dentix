# System Architecture

Entry-point summaries of topology, deployable units, and solution strategy live in the software design document (`00-software-design-document.md`, §4–§7); they are intentionally not duplicated here. Authoritative detail is distributed as follows: module catalog and dependencies — `07-context-module-map.md`; communication, transactions, outbox — `08-transaction-event-semantics.md`; API style — `05-api-guidelines.md`; browser authentication — `09-authentication-session-architecture.md`.

This file holds only the architecture facts owned nowhere else:

## Architecture style

A modular monolith is the approved starting architecture (ADR-001). It provides strong transactional consistency and simpler deployment while preserving domain boundaries that may later be extracted if justified.

## Tenancy and office model

The first product serves one office. Rows include `office_id` where appropriate to prevent global singleton assumptions and ease future evolution. Multi-location UX and central billing remain out of scope.

## Availability target

Business-hours reliability suitable for one office (99.5%/month target per the NFRs), with documented degraded modes and recovery. The system is not designed as a life-support or emergency-care device.
