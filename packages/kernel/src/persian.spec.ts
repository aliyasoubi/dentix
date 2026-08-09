import {
  canonicalizeIranianMobile,
  normalizeDigits,
  normalizeForSearch,
  normalizePersianText,
  toPersianDigits,
} from "./persian";

describe("normalizeDigits", () => {
  it("converts Persian digits to Latin", () => {
    expect(normalizeDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("converts Arabic-Indic digits to Latin", () => {
    expect(normalizeDigits("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("leaves Latin digits and other characters untouched", () => {
    expect(normalizeDigits("abc 123")).toBe("abc 123");
  });
});

describe("toPersianDigits", () => {
  it("converts Latin digits to Persian digits", () => {
    expect(toPersianDigits("09123456789")).toBe("۰۹۱۲۳۴۵۶۷۸۹");
  });

  it("leaves non-digit characters untouched", () => {
    expect(toPersianDigits("1,234/56")).toBe("۱,۲۳۴/۵۶");
  });

  it("is the inverse of normalizeDigits", () => {
    expect(normalizeDigits(toPersianDigits("2500000"))).toBe("2500000");
  });
});

describe("normalizePersianText", () => {
  it("normalizes Arabic Yeh (ي) to Persian Yeh (ی)", () => {
    expect(normalizePersianText("علي")).toBe("علی");
  });

  it("normalizes Arabic Kaf (ك) to Persian Kaf (ک)", () => {
    expect(normalizePersianText("مكتب")).toBe("مکتب");
  });

  it("strips Arabic diacritics (tashkeel)", () => {
    expect(normalizePersianText("مُحَمَّد")).toBe("محمد");
  });

  it("collapses zero-width non-joiner to a space and trims whitespace", () => {
    expect(normalizePersianText("می‌کنم")).toBe("می کنم");
  });

  it("collapses repeated whitespace and trims", () => {
    expect(normalizePersianText("  رضا   احمدی  ")).toBe("رضا احمدی");
  });
});

describe("normalizeForSearch", () => {
  it("combines Yeh/Kaf normalization, digit normalization, and lowercasing", () => {
    expect(normalizeForSearch("علي")).toBe(normalizeForSearch("علی"));
  });

  it("makes Latin-name search case-insensitive", () => {
    expect(normalizeForSearch("Ali REZAEI")).toBe(normalizeForSearch("ali rezaei"));
  });

  it("makes two differently-typed forms of the same phone number match", () => {
    expect(normalizeForSearch("۰۹۱۲۳۴۵۶۷۸۹")).toBe(normalizeForSearch("09123456789"));
  });
});

describe("canonicalizeIranianMobile", () => {
  const canonical = "+989123456789";

  it("accepts the 09xxxxxxxxx form", () => {
    expect(canonicalizeIranianMobile("09123456789")).toBe(canonical);
  });

  it("accepts the +989xxxxxxxxx form", () => {
    expect(canonicalizeIranianMobile("+989123456789")).toBe(canonical);
  });

  it("accepts the 00989xxxxxxxxx form", () => {
    expect(canonicalizeIranianMobile("00989123456789")).toBe(canonical);
  });

  it("accepts Persian digits in any of the three forms", () => {
    expect(canonicalizeIranianMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe(canonical);
    expect(canonicalizeIranianMobile("+۹۸۹۱۲۳۴۵۶۷۸۹")).toBe(canonical);
  });

  it("ignores spaces and dashes commonly used when typing a number", () => {
    expect(canonicalizeIranianMobile("0912-345-6789")).toBe(canonical);
    expect(canonicalizeIranianMobile("0912 345 6789")).toBe(canonical);
  });

  it("returns null for a landline number (no mobile 9-prefix)", () => {
    expect(canonicalizeIranianMobile("02112345678")).toBeNull();
  });

  it("returns null for a too-short number", () => {
    expect(canonicalizeIranianMobile("0912345")).toBeNull();
  });

  it("returns null for a non-Iranian international number", () => {
    expect(canonicalizeIranianMobile("+15551234567")).toBeNull();
  });

  it("returns null for empty or garbage input", () => {
    expect(canonicalizeIranianMobile("")).toBeNull();
    expect(canonicalizeIranianMobile("hello")).toBeNull();
  });
});
