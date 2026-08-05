# Dentix — Bilingual Single-Office Dental PMS Implementation Documentation Package

**Version:** 0.2.0

**Baseline date:** 2026-08-02

**Status:** Concept approved for detailed design; not yet production-approved

## Purpose

This package is the implementation baseline for a custom, browser-based dental practice management system for one dental office. The product is designed for domestic Iranian operation with a Farsi-only, RTL-only interface (ADR-012), first-class Jalali date handling with Gregorian/UTC canonical storage, and unambiguous rial/toman money presentation. It deliberately excludes insurance, claims, payroll, general accounting, native imaging hardware, electronic prescribing, card vaulting, AI diagnosis, native mobile applications, and multi-location central billing.

The design combines three product principles:

  - **Curve Dental:** simple, fast, patient-centered daily workflows.
  - **CareStack:** connected clinical, scheduling, laboratory, and follow-up workflows.
  - **Open Dental:** transparent operational state, planned appointments, lab tracking, customization, auditability, and data portability.

These products are references for ideas only. The implementation must use original UX, terminology, source code, and visual design.

## Recommended technology baseline

  - Angular 22 with Angular Material and CDK
  - A custom dental design system layered above Material/CDK
  - NestJS on Node.js 24 LTS
  - PostgreSQL 18
  - REST APIs documented with OpenAPI
  - Redis and BullMQ for scheduled reminders and background work
  - Encrypted S3-compatible object storage for documents and basic images
  - OIDC-based authentication with MFA
  - Modular monolith architecture
  - Canonical financial storage in Iranian rials with explicitly labeled rial/toman display
  - Asia/Tehran office timezone, first-class Jalali UI/printing, and Gregorian/UTC canonical interchange

Exact patch versions must be pinned in the repository and reviewed through the normal dependency update process.

## Package map

| **Folder**           | **Purpose**                                                         |
| -------------------- | ------------------------------------------------------------------- |
| docs/01-product      | Vision, scope, roles, source-product traceability, roadmap          |
| docs/02-requirements | Functional requirements by domain                                   |
| docs/03-ux           | Information architecture, design system, bilingual and motion rules |
| docs/04-architecture | System, domain, data, API, and architecture decisions               |
| docs/05-quality      | Security, testing, acceptance, and definition of done               |
| docs/06-operations   | Deployment, recovery, monitoring, and releases                      |

## Core product model

The system uses five connected concepts instead of separate mini-applications for every dental specialty:

1. **Treatment plan:** proposed procedures, phases, fees, acceptance, and scheduling.
2. **Treatment journey:** long-running care such as implant, orthodontic, crown/bridge, denture, endodontic-restorative, or custom treatment.
3. **Follow-up task:** one action, one owner, and one due date.
4. **Lab order:** external laboratory work with dependency and readiness tracking.
5. **Recall:** repeated routine care after a defined interval.

## Implementation order

1. Foundation, security, Iranian bilingual/date/money design system, and patient registry
2. Scheduling, appointment lifecycle, waitlist, and recall
3. Encounters, odontogram, notes, and periodontal charting
4. Treatment planning, journeys, follow-up tasks, and lab orders
5. Patient ledger, receipts, and fixed reports
6. Documents, communications, export, hardening, migration, and pilot

## Governance

  - Clinical terminology and workflows require dentist approval.
  - Financial ledger rules require office-manager approval.
  - Privacy and security controls require jurisdiction-specific legal review before real patient data is processed.
  - A decision that contradicts an approved ADR requires a replacement ADR.
  - Requirements use **MUST**, **SHOULD**, and **MAY** in the RFC 2119 sense.
