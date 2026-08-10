import { renderReceiptHtml } from "./receipt-template";
import type { ReceiptFixture } from "./receipt-fixture";

const FONTS = { regularBase64: "REGULAR_FONT_BASE64", boldBase64: "BOLD_FONT_BASE64" };
const BRAND_ICON_SVG = "<svg><title>test icon</title></svg>";

const FIXTURE: ReceiptFixture = {
  receiptNumber: "RC-0001",
  issuedOn: { year: 2025, month: 12, day: 22 }, // Dey 1, 1404
  patientNativeName: "رضا احمدی",
  patientLatinName: "Reza Ahmadi",
  procedureDescriptionFa: "جرم‌گیری و بروساژ",
  amountRial: 25_000_000n,
  displayUnit: "TOMAN",
};

describe("renderReceiptHtml", () => {
  it("is a pure function: no filesystem or network access, same input always produces the same output", () => {
    const first = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    const second = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(second).toBe(first);
  });

  it("renders the Persian native name and the Latin name, wrapped for bidi isolation", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain("رضا احمدی");
    expect(html).toContain('<span class="row__value ltr-isolate">Reza Ahmadi</span>');
  });

  it("wraps the receipt number/code for bidi isolation rather than converting its digits to Persian", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain('<span class="ltr-isolate">RC-0001</span>');
  });

  it("renders the Jalali date in Persian digits (2025-12-22 is Dey 1, 1404)", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain("۱۴۰۴/۱۰/۰۱");
  });

  it("renders the amount converted to toman, grouped, in Persian digits, with the توما ن unit label", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain("۲٬۵۰۰٬۰۰۰");
    expect(html).toContain("تومان");
  });

  it("falls back to a labeled rial amount when the value isn't a whole number of tomans", () => {
    const html = renderReceiptHtml({ ...FIXTURE, amountRial: 25_000_001n }, FONTS, BRAND_ICON_SVG);
    expect(html).toContain("۲۵٬۰۰۰٬۰۰۱");
    expect(html).toContain("ریال");
  });

  it("embeds both font weights as base64 data URIs — no network fetch at render time (ADR-009)", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain(`url(data:font/woff2;base64,${FONTS.regularBase64})`);
    expect(html).toContain(`url(data:font/woff2;base64,${FONTS.boldBase64})`);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("inlines the supplied brand icon SVG verbatim", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain(BRAND_ICON_SVG);
  });

  it("escapes HTML-significant characters in free text fields rather than injecting them raw", () => {
    const html = renderReceiptHtml(
      { ...FIXTURE, procedureDescriptionFa: 'جرم‌گیری <script>"x"</script> & بروساژ' },
      FONTS,
      BRAND_ICON_SVG,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("sets an RTL Farsi document language and direction", () => {
    const html = renderReceiptHtml(FIXTURE, FONTS, BRAND_ICON_SVG);
    expect(html).toContain('lang="fa-IR"');
    expect(html).toContain('dir="rtl"');
  });
});
