/**
 * Normalization is for search, never display (CLAUDE.md invariant 6):
 * every function here produces a value used only for matching/dedup — the
 * original, as-entered text is always retained separately and shown as-is.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian and Arabic-Indic digits -> Latin. Everything else passes through untouched. */
export function normalizeDigits(input: string): string {
  let result = "";
  for (const ch of input) {
    const persianIndex = PERSIAN_DIGITS.indexOf(ch);
    if (persianIndex !== -1) {
      result += String(persianIndex);
      continue;
    }
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(ch);
    result += arabicIndex !== -1 ? String(arabicIndex) : ch;
  }
  return result;
}

/** Latin digits -> Persian digits, for display. The inverse of normalizeDigits. */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);
}

// Arabic-script letters that are typed interchangeably with their Persian
// equivalents (different keyboards/input methods, copy-pasted Arabic
// text) but must match as the same letter for search purposes.
const ARABIC_TO_PERSIAN_CHAR: ReadonlyMap<string, string> = new Map([
  ["ي", "ی"], // Arabic Yeh ي -> Persian Yeh ی
  ["ى", "ی"], // Alef Maksura ى -> Persian Yeh ی
  ["ك", "ک"], // Arabic Kaf ك -> Persian Kaf ک
]);

// Tashkeel/harakat (fatha, damma, kasra, sukun, shadda, tanwin, etc.) and
// other Arabic combining diacritics — optional in normal writing, must be
// ignored for search per 02-requirements/01-patient-management.md.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٟۖ-ۜ۟-۪ۨ-ٰۭ]/g;

// ZWNJ (zero-width non-joiner, U+200C) is normal in Persian typing
// (می‌کنم) but shouldn't make two names fail to match on its presence —
// collapsed to a space, then whitespace is re-collapsed below.
const ZERO_WIDTH_NON_JOINER = /‌/g;

/** Yeh/Kaf variant + diacritic + ZWNJ normalization, whitespace collapsed and trimmed. Case and digits untouched — see normalizeForSearch for the full pipeline. */
export function normalizePersianText(input: string): string {
  let result = "";
  for (const ch of input) {
    result += ARABIC_TO_PERSIAN_CHAR.get(ch) ?? ch;
  }
  return result
    .replace(ARABIC_DIACRITICS, "")
    .replace(ZERO_WIDTH_NON_JOINER, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The full search-normalization pipeline for names and free text: Yeh/Kaf
 * and diacritic normalization, digit normalization, case folding (a
 * no-op on Persian script, makes Latin names case-insensitive). This is
 * what patient_name.normalized_value and similar columns store.
 */
export function normalizeForSearch(input: string): string {
  return normalizeDigits(normalizePersianText(input)).toLowerCase();
}

const IRANIAN_MOBILE_LOCAL = /^9\d{9}$/;

/**
 * Accepts the three forms 02-requirements/01-patient-management.md
 * requires — 09xxxxxxxxx, +989xxxxxxxxx, 00989xxxxxxxxx, in Persian,
 * Arabic-Indic, or Latin digits, with common spacing/dashes — and
 * returns one canonical E.164 form (+989xxxxxxxxx) for storage/search,
 * or null if the input isn't a recognizable Iranian mobile number.
 * Landlines and non-Iranian numbers deliberately return null: this
 * canonicalizes mobiles specifically, it doesn't validate phone numbers
 * in general.
 */
export function canonicalizeIranianMobile(rawInput: string): string | null {
  const digitsAndPlus = normalizeDigits(rawInput).replace(/[^\d+]/g, "");

  let local: string | null = null;
  if (digitsAndPlus.startsWith("+98")) {
    local = digitsAndPlus.slice(3);
  } else if (digitsAndPlus.startsWith("0098")) {
    local = digitsAndPlus.slice(4);
  } else if (digitsAndPlus.startsWith("0")) {
    local = digitsAndPlus.slice(1);
  } else {
    local = digitsAndPlus;
  }

  return local && IRANIAN_MOBILE_LOCAL.test(local) ? `+98${local}` : null;
}

const NATIONAL_CODE_LENGTH = 10;

/**
 * The کد ملی check-digit algorithm: weight the first 9 digits by
 * (10 - position), sum, take mod 11 — the 10th digit must equal that
 * remainder when it's below 2, or (11 - remainder) otherwise. Codes with
 * all identical digits (e.g. "0000000000", "1111111111") satisfy this
 * arithmetic but are reserved/never-issued values, so they're rejected
 * separately rather than trusted to the checksum alone.
 */
function hasValidNationalCodeChecksum(digits: string): boolean {
  if (new Set(digits).size === 1) {
    return false;
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  const remainder = sum % 11;
  const checkDigit = Number(digits[9]);
  return remainder < 2 ? checkDigit === remainder : checkDigit === 11 - remainder;
}

/**
 * Accepts an Iranian national code (کد ملی) in Persian, Arabic-Indic, or
 * Latin digits, with common spacing/dashes, and with or without the
 * conventional leading zeros many people omit when typing it. Returns the
 * canonical zero-padded 10-digit form for storage/search, or null if the
 * input isn't a recognizable, checksum-valid national code.
 * 01-patient-management.md: "When enabled by office policy, formatting
 * and checksum validation SHOULD be available" — this is that validation;
 * whether to collect the field at all stays an office choice made by
 * simply leaving it blank, not a config flag this function reads.
 */
export function canonicalizeIranianNationalCode(rawInput: string): string | null {
  const digitsOnly = normalizeDigits(rawInput).replace(/\D/g, "");
  if (digitsOnly.length === 0 || digitsOnly.length > NATIONAL_CODE_LENGTH) {
    return null;
  }
  const padded = digitsOnly.padStart(NATIONAL_CODE_LENGTH, "0");
  return hasValidNationalCodeChecksum(padded) ? padded : null;
}

const PASSPORT_MIN_LENGTH = 4;
const PASSPORT_MAX_LENGTH = 20;
const PASSPORT_ALLOWED_CHARS = /^[A-Z0-9]+$/;

/**
 * A deliberately loose format check, not a checksum — unlike the national
 * code above, passport-number formats vary by issuing country with no
 * single standard the way Iran's national code has (ICAO 9303 standardizes
 * the *document*'s machine-readable zone, not what a receptionist reads off
 * the photo page and types in). Accepts Persian/Arabic-Indic or Latin
 * digits, letters, and common punctuation someone might copy off a printed
 * passport (spaces, dashes) — normalizes digits, strips the punctuation,
 * uppercases, and accepts anything 4-20 alphanumeric characters long.
 * Returns the canonical form, or null if empty or outside that range.
 */
export function canonicalizePassportNumber(rawInput: string): string | null {
  const cleaned = normalizeDigits(rawInput).replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.length < PASSPORT_MIN_LENGTH || cleaned.length > PASSPORT_MAX_LENGTH) {
    return null;
  }
  return PASSPORT_ALLOWED_CHARS.test(cleaned) ? cleaned : null;
}

// A deliberately loose shape check (local@domain, at least one dot in the
// domain part), not full RFC 5322 — this is a dental office's optional
// contact field, not a mail-server's inbound validator, so the same
// pragmatic-over-spec-purist choice canonicalizePassportNumber makes above.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lowercased for the canonical/search value — almost every real mail
 * provider treats the whole address case-insensitively in practice, even
 * though the local part is technically case-sensitive per spec, and this
 * codebase already favors pragmatic matching over spec purism elsewhere
 * (see canonicalizeIranianMobile). Trims surrounding whitespace only;
 * unlike phone/national-code/passport there are no Persian-digit or
 * punctuation variants to normalize away.
 */
export function canonicalizeEmail(rawInput: string): string | null {
  const trimmed = rawInput.trim().toLowerCase();
  return EMAIL_SHAPE.test(trimmed) ? trimmed : null;
}
