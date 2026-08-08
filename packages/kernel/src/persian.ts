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
