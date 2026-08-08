import {
  isLeapJalaaliYear,
  isValidJalaaliDate,
  jalaaliMonthLength,
  toGregorian,
  toJalaali,
} from "jalaali-js";
import { normalizeDigits } from "./persian";

/**
 * ADR-008: Jalali is presentation/input only, Gregorian/UTC stays
 * canonical. Every function here operates on plain (year, month, day)
 * integers, never a JS `Date` object — deliberately, not just for
 * convenience: `jalaali-js`'s own `Date`-based call form reads the
 * object's *local-time* getters, so the same UTC instant would silently
 * convert to a different calendar day depending on which timezone the
 * process happens to run in (a real, verified footgun — see the
 * implementation note in adr-008-jalali-adapter.md). A pure y/m/d
 * function can't have that bug: there's no timezone to get wrong.
 *
 * This is the ADR-approved "conversion-math-only" library, used here as
 * the primary implementation rather than the documented fallback role —
 * see the ADR note for why the split is: this library for kernel's
 * environment-independent conversion, date-fns-jalali (frontend-only)
 * for the Angular Material DateAdapter's Date-based calendar-navigation
 * needs, where local-day semantics are actually correct because that's
 * what a date *picker* operates on.
 */
export interface JalaliYmd {
  readonly year: number;
  readonly month: number; // 1-12, 1 = Farvardin
  readonly day: number;
}

export interface GregorianYmd {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number;
}

export function isJalaliLeapYear(year: number): boolean {
  return isLeapJalaaliYear(year);
}

export function jalaliMonthLength(year: number, month: number): number {
  return jalaaliMonthLength(year, month);
}

export function isValidJalaliDate(ymd: JalaliYmd): boolean {
  return (
    Number.isInteger(ymd.year) &&
    Number.isInteger(ymd.month) &&
    Number.isInteger(ymd.day) &&
    isValidJalaaliDate(ymd.year, ymd.month, ymd.day)
  );
}

export function gregorianToJalali(g: GregorianYmd): JalaliYmd {
  const { jy, jm, jd } = toJalaali(g.year, g.month, g.day);
  return { year: jy, month: jm, day: jd };
}

export function jalaliToGregorian(j: JalaliYmd): GregorianYmd {
  const { gy, gm, gd } = toGregorian(j.year, j.month, j.day);
  return { year: gy, month: gm, day: gd };
}

/** Canonical storage/API form (RFC 3339 date, e.g. "1990-05-15") -> Jalali. */
export function isoDateToJalali(isoDate: string): JalaliYmd {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`not an ISO date (YYYY-MM-DD): ${isoDate}`);
  }
  return gregorianToJalali({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  });
}

/** Jalali -> canonical storage/API form. */
export function jalaliToIsoDate(j: JalaliYmd): string {
  const g = jalaliToGregorian(j);
  return `${String(g.year).padStart(4, "0")}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}

/** Zero-padded "1369/02/25" — digit rendering (Latin here) is a separate, deliberate step; see toPersianDigits. */
export function formatJalali(j: JalaliYmd): string {
  return `${String(j.year).padStart(4, "0")}/${String(j.month).padStart(2, "0")}/${String(j.day).padStart(2, "0")}`;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Latin digits -> Persian digits, for display. The inverse of normalizeDigits. */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);
}

/**
 * Parses "1369/02/25" style input (Persian or Latin digits, `/` or `-`
 * separators) into a validated Jalali date, or null if the text isn't a
 * well-formed, real calendar date — never a partial/best-effort guess,
 * per 03-bilingual-rtl-guidelines.md: "Date controls identify Jalali
 * input and reject ambiguous free-form dates."
 */
export function parseJalaliInput(rawInput: string): JalaliYmd | null {
  const normalized = normalizeDigits(rawInput.trim());
  const match = /^(\d{1,4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(normalized);
  if (!match) {
    return null;
  }
  const candidate: JalaliYmd = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  return isValidJalaliDate(candidate) ? candidate : null;
}
