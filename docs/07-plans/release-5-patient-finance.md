# Release 5 — Patient Finance

**Goal:** immutable patient ledger with exact rial/toman handling, receipts, and reconciliation.
**Spec in scope:** 02-requirements/06-patient-ledger.md, ADR-004, ADR-005

## Tasks
- [ ] Ledger entry types: charge, payment, discount, adjustment, refund, credit transfer, reversal — append-only, bigint rials
- [ ] Payment allocation with explicit unallocated remainder
- [ ] Reversal flow restoring exact prior balance; reasons and threshold approvals
- [ ] Rial/toman presentation: office default + user override; unit label on every control, total, report, receipt, export; no silent rounding of non-divisible values
- [ ] Receipts and statements: immutable numbering, void events, Persian templates (ADR-012)
- [ ] Day-end close snapshot with post-close adjustment handling
- [ ] Property-based tests: reversal balance, allocation sums, day-end totals, rial↔toman exactness, no float in any money path
- [ ] Production and collections reports
- [ ] Parallel ledger pilot: run alongside current office records for an agreed period

## Exit criteria
- Parallel pilot reconciles exactly with current office records
- 1,250,000 toman stores exactly 12,500,000 rials everywhere
- Posted entries provably immutable at API and DB level
