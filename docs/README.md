# Executive Implementation Summary

**Product name:** Dentix

This package defines a custom dental practice management system for one domestic Iranian office. The application covers patient registration, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, laboratory tracking, recall, patient finance, documents, communications, fixed reports, security, and operations. Iranian localization includes first-class Jalali/Gregorian date handling and explicitly labeled rial/toman presentation.

## Approved product shape

  - Angular 22 and Angular Material/CDK with a custom dental design system.
  - NestJS on Node.js 24 LTS and PostgreSQL 18.
  - A modular monolith, not microservices.
  - Farsi-only (fa-IR), RTL-only UI with Jalali-only date presentation (ADR-012); Gregorian/UTC remains canonical for storage and APIs.
  - Canonical financial storage in Iranian rials with explicitly labeled rial/toman input and display.
  - A shared Treatment Journey model for implant, orthodontic, prosthetic, and custom long-running care.
  - Immutable signed clinical records and immutable posted financial records.
  - No insurance, claims, full accounting, native imaging drivers, e-prescribing, AI diagnosis, or marketing automation.

## Start here

**`04-architecture/00-software-design-document.md`** is the standard software design document for this project — one arc42-structured file covering architecture, decisions, quality requirements, risks, and the release-by-release build order. It cross-references every file below rather than duplicating them; when in doubt, the detailed file wins.

## Contents

  - **00-review** — design review gap analysis
  - **01-product** — readme, product vision, scope and exclusions, roles and permissions, feature traceability, product roadmap, glossary, references
  - **02-requirements** — patient management, scheduling, clinical charting, treatment planning, journeys/follow-up/labs/recall, patient ledger, documents and communications, reporting, data migration, non-functional requirements
  - **03-ux** — information architecture, design system, bilingual/RTL guidelines, motion and accessibility, UI design system, brand identity
  - **04-architecture** — software design document, system architecture, domain model, module boundaries, data model, API guidelines, configuration catalog, ADR-001 through ADR-012
  - **05-quality** — security and privacy, test strategy, acceptance criteria, definition of done
  - **06-operations** — deployment, backup and recovery, monitoring, release process, implementation checklist
  - **07-plans** — release plans R0 through R7 (plus R0.5 walking skeleton) and the risk register

See the root `README.md` for the full directory layout and how to use this package.
