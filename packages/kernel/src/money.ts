import { normalizeDigits, toPersianDigits } from "./persian";

/**
 * ADR-005 / 04-data-model.md: the Iranian rial (bigint, integer, signed)
 * is the only canonical monetary representation — everywhere else (data
 * entry, display, reports, print) is a labeled presentation of a rial
 * amount, never a second source of truth. 1 toman = 10 rials, exactly.
 * Every function here uses bigint arithmetic; a JS `number` never touches
 * a monetary value.
 */
export type MoneyDisplayUnit = "RIAL" | "TOMAN";

export const RIALS_PER_TOMAN = 10n;

/** Display/entry unit -> canonical rials. Toman -> rial is always exact (multiplication), never fails. */
export function toCanonicalRials(amount: bigint, unit: MoneyDisplayUnit): bigint {
  return unit === "TOMAN" ? amount * RIALS_PER_TOMAN : amount;
}

/**
 * Canonical rials -> display/entry unit. Returns null when `unit` is
 * TOMAN and the amount isn't evenly divisible by 10 — per
 * 05-ui-design-system.md, an ENTRY path must reject that case with a
 * validation message rather than truncate or round; a DISPLAY path must
 * use formatMoneyForDisplay instead, which never fails.
 */
export function fromCanonicalRials(amountInRials: bigint, unit: MoneyDisplayUnit): bigint | null {
  if (unit === "RIAL") {
    return amountInRials;
  }
  return amountInRials % RIALS_PER_TOMAN === 0n ? amountInRials / RIALS_PER_TOMAN : null;
}

export interface FormattedMoney {
  readonly value: bigint;
  readonly unit: MoneyDisplayUnit;
}

/**
 * Display-safe variant: never throws/fails. When the configured unit is
 * TOMAN but the amount isn't a whole number of tomans, falls back to an
 * explicitly labeled rial rendering instead of rounding or truncating
 * (05-ui-design-system.md's "explicit rial fallback, labeled").
 */
export function formatMoneyForDisplay(amountInRials: bigint, unit: MoneyDisplayUnit): FormattedMoney {
  if (unit === "TOMAN" && amountInRials % RIALS_PER_TOMAN !== 0n) {
    return { value: amountInRials, unit: "RIAL" };
  }
  return { value: fromCanonicalRials(amountInRials, unit)!, unit };
}

const DECIMAL_INTEGER = /^-?(0|[1-9]\d*)$/;

/**
 * API boundary (05-api-guidelines.md): `amountRial` is exchanged as a
 * decimal-integer string, never a JSON number, so large values survive
 * JS's float-backed JSON parser intact. Rejects anything that isn't a
 * plain signed integer — no decimal point, no exponent, no leading zeros
 * (except "0" itself), no grouping separators (those are an entry/display
 * concern, see parseMoneyInput).
 */
export function parseAmountRialString(value: string): bigint | null {
  return DECIMAL_INTEGER.test(value) ? BigInt(value) : null;
}

export function amountRialToString(amountInRials: bigint): string {
  return amountInRials.toString();
}

// U+066C ARABIC THOUSANDS SEPARATOR (٬) is the conventional Persian
// grouping mark; a plain "," is also accepted since some users type on a
// Latin keyboard layout. Both are stripped, not counted as part of the
// number.
const GROUPING_SEPARATORS = /[٬,]/g;

/**
 * Parses a money *entry* field's raw text (Persian or Latin digits,
 * optional grouping separators) into a non-negative integer amount in
 * whatever unit the field represents — the caller still owns the
 * toman/rial conversion via toCanonicalRials. Returns null for anything
 * that isn't an unsigned whole number, including decimal input: rial and
 * toman are both integer units, so "2500.5" is rejected outright rather
 * than guessing which side of the dot is meaningful
 * (05-ui-design-system.md: "Reject ambiguous decimal input").
 */
export function parseMoneyInput(rawInput: string): bigint | null {
  const stripped = normalizeDigits(rawInput.trim()).replace(GROUPING_SEPARATORS, "");
  return /^\d+$/.test(stripped) ? BigInt(stripped) : null;
}

/**
 * Display formatting for an integer amount: grouped with the Persian
 * thousands separator and rendered in Persian digits — the inverse of
 * parseMoneyInput's normalization, not of parseAmountRialString (which is
 * the ASCII API wire format, never shown to a user). Entry fields are
 * always non-negative (see parseMoneyInput), but a signed rial amount
 * (e.g. a ledger reversal) can still reach this display-only formatter,
 * so the sign is preserved rather than silently dropped or mis-grouped.
 */
export function formatMoneyInputGrouped(amount: bigint): string {
  const negative = amount < 0n;
  const digits = (negative ? -amount : amount).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return (negative ? "-" : "") + toPersianDigits(grouped);
}
