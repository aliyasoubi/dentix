import { asMoney, type GregorianYmd, type Money, type MoneyDisplayUnit } from "@dentix/kernel";

export interface ReceiptFixture {
  readonly receiptNumber: string;
  /** Canonical Gregorian business date (ADR-005) — the template converts it to Jalali for display, never the reverse. */
  readonly issuedOn: GregorianYmd;
  readonly patientNativeName: string;
  readonly patientLatinName: string;
  readonly procedureDescriptionFa: string;
  /** Canonical rial amount (ADR-005) — the template converts to the display unit, never stores a converted value. */
  readonly amountRial: Money;
  readonly displayUnit: MoneyDisplayUnit;
}

/**
 * Deterministic fictional data — never real patient data
 * (05-quality/01-security-privacy.md). Exercises every ADR-009 acceptance
 * criterion in one fixture: Persian text, a Latin name inside RTL flow,
 * Persian digits, both a rial and a toman label (the amount is a whole
 * number of tomans, so DsMoneyDisplay's toman rendering path is what's on
 * screen — the kernel money fixtures already cover the rial-fallback
 * case), and a Jalali date. 2025-12-22 is Dey 1, 1404 — an ICU-cross-
 * validated fixture already frozen in packages/kernel/src/jalali.spec.ts,
 * not a fresh unverified date.
 */
export const DUMMY_RECEIPT_FIXTURE: ReceiptFixture = {
  receiptNumber: "RC-0001",
  issuedOn: { year: 2025, month: 12, day: 22 },
  patientNativeName: "رضا احمدی",
  patientLatinName: "Reza Ahmadi",
  procedureDescriptionFa: "جرم‌گیری و بروساژ",
  amountRial: asMoney(25_000_000n),
  displayUnit: "TOMAN",
};
