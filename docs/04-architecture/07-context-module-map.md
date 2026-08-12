# Bounded Context and Module Map

This document is authoritative for domain ownership and allowed module dependencies. A database table, aggregate, command, or business rule has exactly one owning module.

## Module catalog

| Bounded context | NestJS module | Owns | Does not own |
|---|---|---|---|
| Identity and Access | `identity-access` | User identity link, roles, permissions, sessions, authentication audit facts | Clinical provider eligibility or office configuration |
| Office Administration | `office-administration` | Office, provider profile, operatory, office hours, closures, operational policy | Appointments or clinical records |
| Clinical Catalog | `clinical-catalog` | Procedure codes, clinical metadata, effective-dated fees, approved templates | Completed procedures, treatment decisions, ledger entries |
| Patient Registry | `patients` | Patient identity, names, contacts, relationships, alerts, aliases, merge process | Appointments, encounters, documents, or balances |
| Scheduling | `scheduling` | Appointment, availability, blocks, waitlist, planned appointment, recall schedule | Lab-order state or clinical encounter content |
| Clinical | `clinical` | Encounter, history versions, notes, findings, diagnoses, odontogram, perio, completed procedures | Treatment-plan decisions or patient ledger |
| Treatment Planning | `treatment-planning` | Plan, plan version, phases, items, presented snapshots, patient decisions | Journey execution or posted charges |
| Treatment Continuity | `treatment-continuity` | Journey, stage history, follow-up tasks, next-action policy | Appointment reservation or lab-order lifecycle |
| Laboratory | `laboratory` | Laboratory, lab order, revisions, readiness, quality check | Appointment lifecycle |
| Patient Finance | `patient-finance` | Ledger entries, allocations, receipts, day close, finance approvals | General accounting or clinical truth |
| Documents | `documents` | Document metadata, versions, storage lifecycle, consent artifact | Object-store vendor implementation |
| Communications | `communications` | Message intent, template version, delivery attempt, delivery status | Marketing campaigns or clinical decisions |
| Reporting | `reporting` | Read models, report definitions, generated report artifacts | Authoritative business writes |
| Outbox | `outbox` | Outbox event envelope/payload and its claim/publish lifecycle — shared transaction infrastructure per rule 2 above, schema-only until a real consumer exists (`00-build-sequencing.md`) | Event consumption, delivery, or any domain business rule |
| Audit | `audit` | Append-only security and business audit events, controlled audit queries | Mutation of source-domain records |
| Integrations | `integrations` | Vendor adapters, callback verification, anti-corruption mappings | Domain policy or authoritative business state |

Odontogram and periodontal charting are subdomains inside `clinical`, not top-level modules. Journeys, follow-up, and next-action management are inside `treatment-continuity`. Recall scheduling is owned by `scheduling`; continuity may request or observe recall through a public port or event.

## Allowed dependency direction

| Consumer | May call synchronously | May consume events from |
|---|---|---|
| `identity-access` | `office-administration` for active-office policy | Permission/configuration changes |
| `patients` | `identity-access` authorization port | None required |
| `scheduling` | `patients`, `office-administration` | Lab readiness, recall requests |
| `clinical` | `patients`, `scheduling`, `clinical-catalog` | Appointment arrival/completion facts |
| `treatment-planning` | `patients`, `clinical`, `clinical-catalog` | Procedure completion facts |
| `treatment-continuity` | `patients`, `treatment-planning`, `scheduling` | Procedure, appointment, and lab events |
| `laboratory` | `patients`, `treatment-continuity` | Journey and appointment events |
| `patient-finance` | `patients`, `clinical-catalog` | Procedure completion and plan facts |
| `documents` | `patients` | Encounter, plan, journey, lab, receipt facts |
| `communications` | `patients` contact port | Appointment, recall, follow-up, and lab events |
| `reporting` | No command-side module calls | Published events and approved read projections |
| `outbox` | No domain module calls | N/A — nothing consumes outbox_event yet (`00-build-sequencing.md`) |
| `audit` | No domain module calls | Audit facts from every module |
| `integrations` | Public application ports only | Delivery or storage work requests |

Calls not listed here require a context-map update and architecture review.

## Public module contract

Each module exposes only:

- Application commands and queries.
- Narrow synchronous ports for facts required before a command can commit.
- Versioned integration events for facts that may propagate after commit.
- Stable identifiers and transport-neutral result/error types.

Modules must not import another module's entities, repositories, ORM records, or internal services. A foreign identifier does not grant access to the foreign aggregate.

## Data ownership rules

1. Every table is assigned to one module in `04-data-model.md`.
2. Only the owning module writes its tables, except the shared transaction infrastructure that appends `outbox_event` and `audit_event` through their defined ports.
3. Reporting may read approved projections or database views; it never updates source tables.
4. Cross-module foreign keys are allowed for integrity when both modules share PostgreSQL, but they do not authorize repository access.
5. Signed clinical records and posted financial entries keep their original patient reference. A patient merge resolves them through the patient alias/canonical mapping; immutable history is not rewritten.

## Architecture enforcement

CI must enforce module import boundaries, forbid infrastructure imports from domain/application code, and detect direct repository imports across modules. Public contracts require contract tests.
