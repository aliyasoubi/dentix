import {
  formatJalali,
  formatMoneyForDisplay,
  formatMoneyInputGrouped,
  gregorianToJalali,
  toPersianDigits,
} from "@dentix/kernel";
import type { ReceiptFixture } from "./receipt-fixture";

export interface EmbeddedFonts {
  readonly regularBase64: string;
  readonly boldBase64: string;
}

const UNIT_LABEL_FA: Record<"RIAL" | "TOMAN", string> = {
  RIAL: "ریال",
  TOMAN: "تومان",
};

/**
 * Pure HTML generation — no filesystem/network access (ADR-009: "no
 * network fetch at render time"), so it's trivially unit-testable without
 * Playwright. Fonts and the brand icon are passed in as data, not read
 * here; infrastructure/ owns loading them. Reuses @dentix/kernel's
 * Jalali (ADR-008/S5) and Money (ADR-005/S6) formatting directly — the
 * same functions the Angular UI uses, not a second, divergent
 * implementation for print.
 */
export function renderReceiptHtml(
  fixture: ReceiptFixture,
  fonts: EmbeddedFonts,
  brandIconSvg: string,
): string {
  const jalali = gregorianToJalali(fixture.issuedOn);
  const issuedOnLabel = toPersianDigits(formatJalali(jalali));
  const display = formatMoneyForDisplay(fixture.amountRial, fixture.displayUnit);
  const amountLabel = toPersianDigits(formatMoneyInputGrouped(display.value));
  const unitLabel = UNIT_LABEL_FA[display.unit];

  return `<!doctype html>
<html lang="fa-IR" dir="rtl">
<head>
<meta charset="utf-8" />
<title>رسید ${escapeHtml(fixture.receiptNumber)}</title>
<style>
  @font-face {
    font-family: "Vazirmatn";
    font-weight: 400;
    src: url(data:font/woff2;base64,${fonts.regularBase64}) format("woff2");
  }
  @font-face {
    font-family: "Vazirmatn";
    font-weight: 700;
    src: url(data:font/woff2;base64,${fonts.boldBase64}) format("woff2");
  }
  @page {
    size: A4;
    margin: 24mm 18mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    font-family: "Vazirmatn", sans-serif;
    color: #172b34;
    font-size: 13pt;
    line-height: 1.9;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 2px solid #155c68;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .header__icon {
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
  }
  .header__brand {
    font-weight: 700;
    font-size: 18pt;
    color: #155c68;
  }
  .header__receipt-number {
    margin-inline-start: auto;
    font-weight: 700;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #dce5e9;
  }
  .row__label {
    color: #50656f;
  }
  .row__value {
    font-weight: 700;
  }
  /* Latin patient name inside RTL flow — bidi isolation, not mirrored
     (03-bilingual-rtl-guidelines.md). */
  .ltr-isolate {
    direction: ltr;
    unicode-bidi: isolate;
    font-family: "Inter", "Vazirmatn", sans-serif;
    display: inline-block;
  }
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
  .amount {
    margin-top: 20px;
    padding: 14px;
    background: #eef9fa;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .amount__label {
    font-weight: 700;
  }
  .amount__value {
    font-weight: 700;
    font-size: 16pt;
  }
  .amount__unit {
    color: #50656f;
    font-size: 11pt;
    margin-inline-start: 4px;
  }
  .footer {
    margin-top: 32px;
    color: #71848d;
    font-size: 10pt;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="header">
    <span class="header__icon">${brandIconSvg}</span>
    <span class="header__brand">دنتیکس</span>
    <span class="header__receipt-number">شماره رسید: <span class="ltr-isolate">${escapeHtml(fixture.receiptNumber)}</span></span>
  </div>

  <div class="row">
    <span class="row__label">نام بیمار (فارسی)</span>
    <span class="row__value">${escapeHtml(fixture.patientNativeName)}</span>
  </div>
  <div class="row">
    <span class="row__label">نام بیمار (لاتین)</span>
    <span class="row__value ltr-isolate">${escapeHtml(fixture.patientLatinName)}</span>
  </div>
  <div class="row">
    <span class="row__label">تاریخ</span>
    <span class="row__value tabular-nums">${issuedOnLabel}</span>
  </div>
  <div class="row">
    <span class="row__label">شرح خدمت</span>
    <span class="row__value">${escapeHtml(fixture.procedureDescriptionFa)}</span>
  </div>

  <div class="amount">
    <span class="amount__label">مبلغ قابل پرداخت</span>
    <span>
      <span class="amount__value tabular-nums">${amountLabel}</span>
      <span class="amount__unit">${unitLabel}</span>
    </span>
  </div>

  <div class="footer">این یک رسید نمونه است و فاقد ارزش مالی می‌باشد.</div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
