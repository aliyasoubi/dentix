# Dentix — Farsi-First Single-Office Dental PMS

**Version:** 0.5.0

**Baseline date:** 2026-08-06

**Status:** Concept approved for detailed design; not yet production-approved

## Purpose

This package is the implementation baseline for a custom, browser-based dental practice management system for one dental office. The product is designed for domestic Iranian operation with a Farsi-only, RTL-only interface (ADR-012), first-class Jalali date handling with Gregorian/UTC canonical storage, and unambiguous rial/toman money presentation. It deliberately excludes insurance, claims, payroll, general accounting, native imaging hardware, electronic prescribing, card vaulting, AI diagnosis, native mobile applications, and multi-location central billing.

The product principles are fast daily operation, connected patient workflows, explicit operational state, auditability, and data portability.

## Technology baseline

The authoritative stack and constraints table is `04-architecture/00-software-design-document.md` §2. Exact patch versions are pinned in the repository and updated only through review.

## Package map

| **Folder**           | **Purpose**                                                         |
| -------------------- | ------------------------------------------------------------------- |
| docs/01-product      | Vision, scope, roles, capability traceability, roadmap              |
| docs/02-requirements | Functional requirements by domain                                   |
| docs/03-ux           | Information architecture, Farsi/RTL design, motion and accessibility |
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

The release sequence is owned by `06-product-roadmap.md` (R0–R7) and indexed with exit gates in `../07-plans/README.md`; it is not duplicated here.

## Governance

  - Clinical terminology and workflows require dentist approval.
  - Financial ledger rules require office-manager approval.
  - The Real-Data Authorization Gate must be approved before any real patient data is copied, imported, tested, or processed.
  - A decision that contradicts an approved ADR requires a replacement ADR.
  - Requirements use **MUST**, **SHOULD**, and **MAY** in the RFC 2119 sense.
