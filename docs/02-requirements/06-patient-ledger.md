# Patient Ledger Requirements

## Purpose

The ledger records patient financial activity. It is not general accounting.

## Entry types

  - Charge
  - Payment
  - Discount
  - Adjustment
  - Refund
  - Credit transfer
  - Reversal

## Accounting rules

1. Posted entries are immutable.
2. Corrections use a reversal and a new correct entry.
3. The canonical monetary unit is the Iranian rial (IRR), stored as a signed 64-bit integer number of rials. JavaScript floating-point values are not authoritative for money.
4. Every entry records patient, business date, timestamp, author, type, canonical rial amount, source, and reason where applicable.
5. A payment may be allocated to charges, but the unallocated amount remains explicit.
6. A refund references the original payment when possible.
7. Balance is derived from posted entries; it is not independently editable.
8. Clinical completion may create a draft charge or posted charge according to office configuration.

## Rial and toman presentation

Money follows the canonical rial/toman rules in ADR-005 (exact 1:10 conversion, mandatory unit labeling, no silent rounding). Ledger-specific additions:

  - The office has a default display unit: RIAL or TOMAN; each user may optionally override display preference.
  - Fee changes are effective-dated. Historical treatment-plan and ledger snapshots retain their original canonical rial values.

## Payment methods

  - Cash
  - External card terminal
  - Bank transfer
  - Cheque
  - Other

No full card number or card-verification data is stored. External references may be stored.

## Day-end reconciliation

The system provides totals by payment method, refunds, discounts, adjustments, charges, and net collections for the office business date. Closing a day creates a snapshot and audit event; later entries appear as post-close adjustments.

## Receipts and statements

  - Receipt by transaction or payment
  - Patient statement for a date range
  - Outstanding-balance statement
  - Persian-only templates in v1 (ADR-012); the per-patient communication-language field is retained in the data model for a future locale under a replacement ADR
  - Explicit rial/toman unit on all monetary sections
  - Immutable receipt number after issue; voiding creates a void event

## Permissions and approvals

  - Refunds, reversals, and discounts over configured thresholds require a reason.
  - Optional manager approval may be enabled.
  - Clinical staff may view balances only if their role requires it.

## Acceptance examples

  - Reversing a payment restores the exact prior balance and preserves both entries.
  - Day-end totals equal the sum of qualifying canonical rial ledger entries, with no floating-point discrepancy.
  - Entering 1,250,000 toman stores exactly 12,500,000 rials and reproduces the same amount in every report and receipt.
  - Editing a completed procedure does not silently edit a posted charge.
