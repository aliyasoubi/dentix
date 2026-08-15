import { AbstractControl, ValidationErrors } from "@angular/forms";
import { canonicalizeIranianMobile, canonicalizeIranianNationalCode } from "@dentix/kernel";

/**
 * Patient-form validation rules, kept as free functions rather than methods on
 * the component so each one can be tested against a bare FormControl instead
 * of through a rendered component. They are the client-side half of rules the
 * API also enforces — see each function for which backend rule it mirrors.
 */

/** Validators.required only rejects an empty string, not "   " — the backend trims before checking, the form must match or a whitespace-only name would round-trip to the server before being rejected. */
export function requiredNonBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length === 0 ? { required: true } : null;
}

/**
 * Deliberately calls the *same* `canonicalizeIranianMobile` the backend's
 * CreatePatientUseCase uses, rather than re-expressing the rule as a local
 * regex. A second, hand-written copy of "what counts as an Iranian mobile"
 * is exactly how a client and server drift into disagreeing — the user would
 * be blocked on input the API accepts, or shown a server error for input the
 * form said was fine. Empty is allowed here; whether a contact is *required*
 * is the group-level rule below.
 */
export function iranianMobile(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (value.length === 0) {
    return null;
  }
  return canonicalizeIranianMobile(value) === null ? { iranianMobile: true } : null;
}

/**
 * Same reasoning as iranianMobile above: calls the backend's own
 * canonicalizeIranianNationalCode rather than a re-implemented checksum, so
 * client and server can't drift apart on what counts as valid. The national
 * code is always optional — empty is valid here too.
 */
export function iranianNationalCode(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (value.length === 0) {
    return null;
  }
  return canonicalizeIranianNationalCode(value) === null ? { iranianNationalCode: true } : null;
}

/**
 * The client-side twin of the backend's CONTACT_REQUIRED rule: a patient
 * needs either a phone number or an explicit "no contact method" flag.
 * Group-level because it spans two controls, and surfaced inline so the user
 * finds out while filling the form instead of on submit.
 */
export function contactRequired(group: AbstractControl): ValidationErrors | null {
  const phone = (group.get("phone")?.value as string | undefined)?.trim() ?? "";
  const contactUnavailable = group.get("contactUnavailable")?.value === true;
  return phone.length === 0 && !contactUnavailable ? { contactRequired: true } : null;
}
