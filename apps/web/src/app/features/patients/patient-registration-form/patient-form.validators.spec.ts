import { FormControl, FormGroup } from "@angular/forms";
import { contactRequired, iranianMobile, requiredNonBlank } from "./patient-form.validators";

describe("patient form validators", () => {
  describe("requiredNonBlank", () => {
    it.each(["", "   ", "\t", "\n "])("rejects %j", (value) => {
      expect(requiredNonBlank(new FormControl(value, { nonNullable: true }))).toEqual({ required: true });
    });

    it("accepts a real name", () => {
      expect(requiredNonBlank(new FormControl("رضا احمدی", { nonNullable: true }))).toBeNull();
    });

    // The whole reason this exists alongside Validators.required, which
    // treats a whitespace-only value as present.
    it("rejects whitespace that Validators.required would let through", () => {
      const control = new FormControl("   ", { nonNullable: true });
      expect(control.errors).toBeNull();
      expect(requiredNonBlank(control)).toEqual({ required: true });
    });
  });

  describe("iranianMobile", () => {
    it.each(["09123456789", "+989123456789", "00989123456789", "۰۹۱۲۳۴۵۶۷۸۹", " 0912 345 6789 "])(
      "accepts %j — a form the backend canonicalizes",
      (value) => {
        expect(iranianMobile(new FormControl(value, { nonNullable: true }))).toBeNull();
      },
    );

    it.each(["not-a-phone", "02112345678", "0912345678", "1234"])("rejects %j", (value) => {
      expect(iranianMobile(new FormControl(value, { nonNullable: true }))).toEqual({ iranianMobile: true });
    });

    // Emptiness is the group rule's business, not this validator's — a blank
    // phone is valid when contactUnavailable is ticked.
    it("treats empty as valid, leaving required-ness to the group rule", () => {
      expect(iranianMobile(new FormControl("", { nonNullable: true }))).toBeNull();
      expect(iranianMobile(new FormControl("   ", { nonNullable: true }))).toBeNull();
    });
  });

  describe("contactRequired", () => {
    function group(phone: string, contactUnavailable: boolean): FormGroup {
      return new FormGroup({
        phone: new FormControl(phone, { nonNullable: true }),
        contactUnavailable: new FormControl(contactUnavailable, { nonNullable: true }),
      });
    }

    it("flags a patient with neither a phone nor the no-contact flag", () => {
      expect(contactRequired(group("", false))).toEqual({ contactRequired: true });
    });

    it("treats a whitespace-only phone as no phone", () => {
      expect(contactRequired(group("   ", false))).toEqual({ contactRequired: true });
    });

    it("accepts a phone alone", () => {
      expect(contactRequired(group("09123456789", false))).toBeNull();
    });

    it("accepts the no-contact flag alone", () => {
      expect(contactRequired(group("", true))).toBeNull();
    });
  });
});
