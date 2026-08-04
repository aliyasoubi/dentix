# ADR-004: Immutable Signed Clinical and Posted Financial Records

  - **Status:** Accepted

  - **Date:** 2026-08-02

## Decision

Signed clinical records and posted ledger entries cannot be edited or deleted in place. Clinical corrections use amendments; financial corrections use reversals and replacement entries.

## Consequences

  - Strong auditability and reproducibility

  - More event/version tables and UI explanation

  - Reports must account for reversals and amendments

  - Draft records remain versioned and concurrency-controlled
