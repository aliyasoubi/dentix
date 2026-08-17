import {
  canonicalizeIranianMobile,
  canonicalizeIranianNationalCode,
  canonicalizePassportNumber,
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

describe("canonicalizeIranianNationalCode", () => {
  it("accepts a valid 10-digit national code and returns it unchanged", () => {
    expect(canonicalizeIranianNationalCode("1234567891")).toBe("1234567891");
  });

  it("pads a shorter code with leading zeros the way many people type it", () => {
    // "0012345679" is a valid checksum; typed without its two leading zeros.
    expect(canonicalizeIranianNationalCode("12345679")).toBe("0012345679");
  });

  it("accepts Persian digits", () => {
    expect(canonicalizeIranianNationalCode("۱۲۳۴۵۶۷۸۹۱")).toBe("1234567891");
  });

  it("accepts Arabic-Indic digits", () => {
    expect(canonicalizeIranianNationalCode("١٢٣٤٥٦٧٨٩١")).toBe("1234567891");
  });

  it("ignores dashes commonly used when displaying a national code", () => {
    expect(canonicalizeIranianNationalCode("123-456789-1")).toBe("1234567891");
  });

  it("rejects a code with an incorrect check digit", () => {
    expect(canonicalizeIranianNationalCode("1234567890")).toBeNull();
  });

  it("rejects reserved all-identical-digit codes even though the checksum arithmetic would pass", () => {
    expect(canonicalizeIranianNationalCode("1111111111")).toBeNull();
    expect(canonicalizeIranianNationalCode("0000000000")).toBeNull();
  });

  it("rejects input longer than 10 digits", () => {
    expect(canonicalizeIranianNationalCode("123456789123")).toBeNull();
  });

  it("returns null for empty or garbage input", () => {
    expect(canonicalizeIranianNationalCode("")).toBeNull();
    expect(canonicalizeIranianNationalCode("hello")).toBeNull();
  });
});

describe("canonicalizePassportNumber", () => {
  it("accepts a typical alphanumeric passport number, uppercased", () => {
    expect(canonicalizePassportNumber("ab1234567")).toBe("AB1234567");
  });

  it("accepts Persian digits mixed with Latin letters", () => {
    expect(canonicalizePassportNumber("AB۱۲۳۴۵۶۷")).toBe("AB1234567");
  });

  it("strips spaces and dashes commonly present when copied off a printed passport", () => {
    expect(canonicalizePassportNumber("AB 123-4567")).toBe("AB1234567");
  });

  it("accepts an all-digit passport number (e.g. many countries' formats)", () => {
    expect(canonicalizePassportNumber("123456789")).toBe("123456789");
  });

  it("rejects a value shorter than 4 characters", () => {
    expect(canonicalizePassportNumber("AB1")).toBeNull();
  });

  it("rejects a value longer than 20 characters", () => {
    expect(canonicalizePassportNumber("A".repeat(21))).toBeNull();
  });

  it("rejects punctuation other than spaces/dashes", () => {
    expect(canonicalizePassportNumber("AB@1234567")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(canonicalizePassportNumber("")).toBeNull();
    expect(canonicalizePassportNumber("   ")).toBeNull();
  });
});
