# Executive Implementation Summary

**Product name:** Dentix

This package defines a custom dental practice management system for one domestic Iranian office. The application covers patient registration, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, laboratory tracking, recall, patient finance, documents, communications, fixed reports, security, and operations. The v1 interface is Farsi-only, RTL-only, and Jalali-only; storage and APIs use Gregorian dates and UTC instants. Financial values are stored in integer rials and displayed with explicit rial/toman units.

## Approved product shape

The binding technical constraints (stack, ADR-fixed decisions) are the table in `04-architecture/00-software-design-document.md` §2 — not duplicated here. The defining product decisions: modular monolith; Farsi-only RTL UI with Jalali-only presentation over Gregorian/UTC + integer-rial canonical storage (ADR-005/012); a shared Treatment Journey model for long-running care; immutable signed clinical and posted financial records (ADR-004); and the exclusions in `01-product/03-scope-and-exclusions.md`.

## Start here

**`04-architecture/00-software-design-document.md`** is the entry point. `document-control.md` defines document authority and conflict resolution.

## Contents

The folder-by-folder layout lives once, in the root `README.md`.
