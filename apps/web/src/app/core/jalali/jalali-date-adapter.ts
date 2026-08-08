import { Injectable } from "@angular/core";
import { DateAdapter } from "@angular/material/core";
import {
  addDays,
  addMonths,
  addYears,
  format as formatJalaliDate,
  getDate,
  getDay,
  getDaysInMonth,
  getMonth,
  getYear,
  isValid as isValidJalaliDate,
  newDate,
} from "date-fns-jalali";
import { faIR } from "date-fns-jalali/locale";
import { parseJalaliInput, toPersianDigits } from "@dentix/kernel";

// date-fns-jalali/types isn't in the package's exports map, so its
// Month/Day literal unions (0-11 / 0-6) aren't importable by name —
// reproduced structurally here instead of importing them.
type JalaliMonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
type JalaliDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Material's DateAdapter contract speaks 'long' | 'short' | 'narrow';
// date-fns-jalali's locale widths are 'wide' | 'abbreviated' | 'narrow'.
function toLocaleWidth(style: "long" | "short" | "narrow"): "wide" | "abbreviated" | "narrow" {
  switch (style) {
    case "long":
      return "wide";
    case "short":
      return "abbreviated";
    case "narrow":
      return "narrow";
  }
}

/**
 * ADR-008: the only file allowed to import date-fns-jalali (enforced by
 * .dependency-cruiser.web.json's adapter-only rule) — every other
 * component reaches Jalali behavior through Angular Material's own
 * DateAdapter injection, never this library directly.
 *
 * Deliberately does NOT use @dentix/kernel's jalaali-js-based conversion
 * for the getter/constructor methods below — see adr-008's implementation
 * note: Material's DateAdapter contract is inherently "local calendar
 * day" (same as Material's own built-in NativeDateAdapter), which is
 * exactly what date-fns-jalali's Date-object API provides. kernel's pure
 * y/m/d functions are for the timezone-independent conversions
 * elsewhere (e.g. this file's own toIso8601/deserialize, which convert
 * between this adapter's Date objects and the canonical Gregorian ISO
 * string sent to/from the backend — grep for the one place this file
 * does use kernel, parseJalaliInput, for its Persian/Latin-digit-aware
 * free-text parsing).
 */
@Injectable()
export class JalaliDateAdapter extends DateAdapter<Date> {
  override getYear(date: Date): number {
    return getYear(date);
  }

  override getMonth(date: Date): number {
    return getMonth(date);
  }

  override getDate(date: Date): number {
    return getDate(date);
  }

  override getDayOfWeek(date: Date): number {
    return getDay(date);
  }

  override getMonthNames(style: "long" | "short" | "narrow"): string[] {
    const width = toLocaleWidth(style);
    return Array.from({ length: 12 }, (_unused, month) =>
      faIR.localize!.month(month as JalaliMonthIndex, { width }),
    );
  }

  override getDateNames(): string[] {
    return Array.from({ length: 31 }, (_unused, index) => toPersianDigits(String(index + 1)));
  }

  override getDayOfWeekNames(style: "long" | "short" | "narrow"): string[] {
    // Sunday-indexed, same convention Material itself uses — the picker
    // reorders using getFirstDayOfWeek(), it doesn't expect this array
    // pre-rotated.
    const width = toLocaleWidth(style);
    return Array.from({ length: 7 }, (_unused, day) => faIR.localize!.day(day as JalaliDayIndex, { width }));
  }

  override getYearName(date: Date): string {
    return toPersianDigits(String(getYear(date)));
  }

  override getFirstDayOfWeek(): number {
    return 6; // Saturday — the Iranian week's first day.
  }

  override getNumDaysInMonth(date: Date): number {
    return getDaysInMonth(date);
  }

  override clone(date: Date): Date {
    return new Date(date.getTime());
  }

  override createDate(year: number, month: number, date: number): Date {
    if (month < 0 || month > 11) {
      return this.invalid();
    }
    const candidate = newDate(year, month, date);
    // newDate overflows out-of-range days instead of rejecting them
    // (e.g. Esfand 30 in a non-leap year rolls into Farvardin) — a
    // DateAdapter must return invalid() instead, or the picker would
    // silently show a different date than what was asked for.
    if (getYear(candidate) !== year || getMonth(candidate) !== month || getDate(candidate) !== date) {
      return this.invalid();
    }
    return candidate;
  }

  override today(): Date {
    return new Date();
  }

  override parse(value: unknown): Date | null {
    if (typeof value !== "string" || value.trim().length === 0) {
      return typeof value === "number" ? new Date(value) : null;
    }
    const jalali = parseJalaliInput(value);
    if (!jalali) {
      return this.invalid();
    }
    return this.createDate(jalali.year, jalali.month - 1, jalali.day);
  }

  override format(date: Date, displayFormat: string): string {
    if (!this.isValid(date)) {
      throw new Error("JalaliDateAdapter: cannot format an invalid date.");
    }
    return toPersianDigits(formatJalaliDate(date, displayFormat, { locale: faIR }));
  }

  override addCalendarYears(date: Date, years: number): Date {
    return addYears(date, years);
  }

  override addCalendarMonths(date: Date, months: number): Date {
    return addMonths(date, months);
  }

  override addCalendarDays(date: Date, days: number): Date {
    return addDays(date, days);
  }

  /**
   * The canonical Gregorian ISO date the backend actually stores
   * (04-data-model.md: "Jalali values are presentation/input values and
   * are never stored as domain dates") — plain native local getters, not
   * date-fns-jalali's, deliberately: this Date's own local y/m/d *is*
   * its Gregorian identity, independent of which calendar's labels are
   * displayed for it.
   */
  override toIso8601(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  override deserialize(value: unknown): Date | null {
    if (typeof value === "string" && value.trim().length > 0) {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (match) {
        const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        return this.isValid(date) ? date : this.invalid();
      }
    }
    return super.deserialize(value);
  }

  override isDateInstance(obj: unknown): boolean {
    return obj instanceof Date;
  }

  override isValid(date: Date): boolean {
    return isValidJalaliDate(date);
  }

  override invalid(): Date {
    return new Date(NaN);
  }
}
