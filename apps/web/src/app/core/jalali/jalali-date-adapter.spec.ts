import { JalaliDateAdapter } from "./jalali-date-adapter";

describe("JalaliDateAdapter", () => {
  let adapter: JalaliDateAdapter;

  beforeEach(() => {
    adapter = new JalaliDateAdapter();
  });

  describe("createDate + getters — Nowruz boundary (ADR-008 fixture)", () => {
    it("1403/01/01 (Farvardin 1) is 2024-03-20 Gregorian", () => {
      const date = adapter.createDate(1403, 0, 1);
      expect(adapter.isValid(date)).toBe(true);
      expect(adapter.getYear(date)).toBe(1403);
      expect(adapter.getMonth(date)).toBe(0);
      expect(adapter.getDate(date)).toBe(1);
      expect(adapter.toIso8601(date)).toBe("2024-03-20");
    });

    it("1403 is a leap year: Esfand 30 (month 11, day 30) is valid", () => {
      const date = adapter.createDate(1403, 11, 30);
      expect(adapter.isValid(date)).toBe(true);
      expect(adapter.toIso8601(date)).toBe("2025-03-20");
    });

    it("1404 is not a leap year: Esfand 30 is rejected rather than silently rolling over", () => {
      const date = adapter.createDate(1404, 11, 30);
      expect(adapter.isValid(date)).toBe(false);
    });
  });

  describe("toIso8601 / deserialize round-trip against the canonical Gregorian value", () => {
    it("round-trips a Jalali date through the ISO string the backend stores", () => {
      const original = adapter.createDate(1369, 1, 25); // 1990-05-15
      const iso = adapter.toIso8601(original);
      expect(iso).toBe("1990-05-15");

      const restored = adapter.deserialize(iso);
      expect(restored).not.toBeNull();
      expect(adapter.getYear(restored!)).toBe(1369);
      expect(adapter.getMonth(restored!)).toBe(1);
      expect(adapter.getDate(restored!)).toBe(25);
    });

    it("rejects a malformed ISO string", () => {
      const result = adapter.deserialize("not-a-date");
      expect(result === null || !adapter.isValid(result)).toBe(true);
    });
  });

  describe("parse — Persian and Latin digit input", () => {
    it("parses Latin-digit slash-separated input", () => {
      const date = adapter.parse("1369/02/25");
      expect(date).not.toBeNull();
      expect(adapter.toIso8601(date!)).toBe("1990-05-15");
    });

    it("parses Persian-digit input to the identical value", () => {
      const date = adapter.parse("۱۳۶۹/۰۲/۲۵");
      expect(date).not.toBeNull();
      expect(adapter.toIso8601(date!)).toBe("1990-05-15");
    });

    it("returns an invalid date for garbage input rather than null (matches Material's contract)", () => {
      const date = adapter.parse("garbage");
      expect(date).not.toBeNull();
      expect(adapter.isValid(date!)).toBe(false);
    });

    it("returns null for an empty string", () => {
      expect(adapter.parse("")).toBeNull();
    });
  });

  describe("format", () => {
    it("renders the display format with Persian digits", () => {
      const date = adapter.createDate(1369, 1, 25);
      expect(adapter.format(date, "yyyy/MM/dd")).toBe("۱۳۶۹/۰۲/۲۵");
    });
  });

  describe("calendar metadata", () => {
    it("week starts on Saturday", () => {
      expect(adapter.getFirstDayOfWeek()).toBe(6);
    });

    it("returns 12 month names and 7 day names", () => {
      expect(adapter.getMonthNames("long")).toHaveLength(12);
      expect(adapter.getDayOfWeekNames("long")).toHaveLength(7);
    });

    it("Farvardin (month 0) is the first long month name", () => {
      expect(adapter.getMonthNames("long")[0]).toBe("فروردین");
    });
  });

  describe("addCalendarDays across the Nowruz boundary", () => {
    it("adding 1 day to Esfand 29 of a non-leap year rolls into Farvardin 1 of the next year", () => {
      const esfand29Of1404 = adapter.createDate(1404, 11, 29);
      expect(adapter.isValid(esfand29Of1404)).toBe(true);
      const next = adapter.addCalendarDays(esfand29Of1404, 1);
      expect(adapter.getYear(next)).toBe(1405);
      expect(adapter.getMonth(next)).toBe(0);
      expect(adapter.getDate(next)).toBe(1);
    });
  });
});
