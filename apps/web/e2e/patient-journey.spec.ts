import { createHmac } from "crypto";
import { expect, test } from "@playwright/test";

/**
 * S4's golden path (02-slices-release-0.5.md): login -> create a patient
 * with a Persian native name and a Latin name -> find them again by
 * typing their mobile number as 09..., +98..., and in Persian digits.
 *
 * Prerequisites this test does NOT set up itself (same reasoning as
 * test:int/test:api assuming `docker compose up -d` already ran):
 *   - The Compose stack up, apps/api built and serving apps/web's build
 *     on E2E_BASE_URL (same-origin, per 09-authentication-session-
 *     architecture.md).
 *   - The `ci-live-test` Keycloak user seeded via
 *     keycloak/seed-ci-live-test-user.sh, AND linked to a real
 *     office_user row via
 *     `npm run dev:bootstrap-office-user --workspace apps/api -- <keycloak-user-id>`
 *     — a fresh Keycloak/Postgres pair has neither by default.
 */
const USERNAME = process.env["E2E_USERNAME"] ?? "ci-live-test";
const PASSWORD = process.env["E2E_PASSWORD"] ?? "CiTestPassword123!";
// Admin-API-imported OTP credentials are raw UTF-8 bytes, not base32 —
// verified against this Keycloak version (see keycloak/seed-ci-live-test-user.sh).
const TOTP_SECRET = process.env["E2E_TOTP_SECRET"] ?? "rawsecretvalue123";

function computeTotp(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", Buffer.from(secret, "utf8")).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

test("login, register a patient, and find them by phone in three forms", async ({ page }) => {
  await page.goto("/patients");

  // Real Keycloak login form (top-level navigation, not mocked).
  await page.getByLabel(/username or email/i).fill(USERNAME);
  await page.getByLabel(/^password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.getByLabel(/one-time code/i).fill(computeTotp(TOTP_SECRET));
  await page.getByRole("button", { name: /sign in/i }).click();

  // Back on the Dentix app, authenticated.
  await expect(page.getByRole("heading", { name: "بیماران" })).toBeVisible();

  const uniqueSuffix = Date.now().toString().slice(-6);
  const nativeName = `بیمار تست ${uniqueSuffix}`;
  const latinName = `Test Patient ${uniqueSuffix}`;
  const phone = `0912${uniqueSuffix}`;

  await page.getByLabel("نام و نام خانوادگی (فارسی)").fill(nativeName);
  await page.getByLabel("نام لاتین (اختیاری)").fill(latinName);
  await page.getByLabel("شماره موبایل").fill(phone);
  await page.getByRole("button", { name: "ثبت بیمار" }).click();

  await expect(page.getByText(`بیمار «${nativeName}»`)).toBeVisible();

  const searchBox = page.getByLabel("جستجوی نام، شماره بیمار یا موبایل");
  const resultRow = page.getByRole("row", { name: new RegExp(latinName) });

  await searchBox.fill(phone);
  await expect(resultRow).toBeVisible();

  await searchBox.fill(`+98${phone.slice(1)}`);
  await expect(resultRow).toBeVisible();

  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const persianDigitPhone = phone.replace(/\d/g, (digit) => persianDigits[Number(digit)]!);
  await searchBox.fill(persianDigitPhone);
  await expect(resultRow).toBeVisible();
});
