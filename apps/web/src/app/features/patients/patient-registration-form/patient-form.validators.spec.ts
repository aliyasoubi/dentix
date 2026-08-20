import { FormControl, FormGroup } from "@angular/forms";
import {
  contactRequired,
  email,
  identifierNumber,
  iranianMobile,
  iranianNationalCode,
  passportNumber,
  patientNumber,
  requiredNonBlank,
} from "./patient-form.validators";

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

  describe("iranianNationalCode", () => {
    it.each(["1234567891", "۱۲۳۴۵۶۷۸۹۱", " 123-456789-1 "])(
      "accepts %j — a form the backend canonicalizes",
      (value) => {
        expect(iranianNationalCode(new FormControl(value, { nonNullable: true }))).toBeNull();
      },
    );

    it.each(["1234567890", "1111111111", "not-a-code"])("rejects %j", (value) => {
      expect(iranianNationalCode(new FormControl(value, { nonNullable: true }))).toEqual({
        iranianNationalCode: true,
      });
    });

    it("treats empty as valid — the national code is always optional", () => {
      expect(iranianNationalCode(new FormControl("", { nonNullable: true }))).toBeNull();
      expect(iranianNationalCode(new FormControl("   ", { nonNullable: true }))).toBeNull();
    });
  });

  describe("passportNumber", () => {
    it.each(["AB1234567", "ab 123-4567", "123456789"])(
      "accepts %j — a form the backend canonicalizes",
      (value) => {
        expect(passportNumber(new FormControl(value, { nonNullable: true }))).toBeNull();
      },
    );

    it.each(["AB", "A".repeat(21), "AB@1234567"])("rejects %j", (value) => {
      expect(passportNumber(new FormControl(value, { nonNullable: true }))).toEqual({
        passportNumber: true,
      });
    });

    it("treats empty as valid — the passport number is always optional", () => {
      expect(passportNumber(new FormControl("", { nonNullable: true }))).toBeNull();
    });
  });

  describe("email", () => {
    it.each(["reza@example.com", "  reza@example.com  ", "Reza.Ahmadi@Example.com"])(
      "accepts %j — a form the backend canonicalizes",
      (value) => {
        expect(email(new FormControl(value, { nonNullable: true }))).toBeNull();
      },
    );

    it.each(["not-an-email", "reza@", "reza example.com"])("rejects %j", (value) => {
      expect(email(new FormControl(value, { nonNullable: true }))).toEqual({ email: true });
    });

    it("treats empty as valid — email is always optional", () => {
      expect(email(new FormControl("", { nonNullable: true }))).toBeNull();
      expect(email(new FormControl("   ", { nonNullable: true }))).toBeNull();
    });
  });

  describe("patientNumber", () => {
    it.each(["1", "2501", "999999"])("accepts %j", (value) => {
      expect(patientNumber(new FormControl(value, { nonNullable: true }))).toBeNull();
    });

    it.each(["0", "-1", "01", "1.5", "abc", "2501x"])("rejects %j", (value) => {
      expect(patientNumber(new FormControl(value, { nonNullable: true }))).toEqual({
        patientNumber: true,
      });
    });

    it("treats empty as valid — omitting it means auto-assign", () => {
      expect(patientNumber(new FormControl("", { nonNullable: true }))).toBeNull();
      expect(patientNumber(new FormControl("   ", { nonNullable: true }))).toBeNull();
    });
  });

  describe("identifierNumber", () => {
    /** Returns the identifierNumber control itself, already attached to a parent group carrying the given nationality — which is what the validator reads. */
    function identifierControlFor(nationality: string, identifierValue: string): FormControl<string> {
      const identifierControl = new FormControl(identifierValue, { nonNullable: true });
      new FormGroup({
        nationality: new FormControl(nationality, { nonNullable: true }),
        identifierNumber: identifierControl,
      });
      return identifierControl;
    }

    it("validates as a national code when nationality is iranian", () => {
      expect(identifierNumber(identifierControlFor("iranian", "1234567891"))).toBeNull();
      expect(identifierNumber(identifierControlFor("iranian", "1234567890"))).toEqual({
        iranianNationalCode: true,
      });
    });

    it("validates as a passport number when nationality is foreign", () => {
      expect(identifierNumber(identifierControlFor("foreign", "AB1234567"))).toBeNull();
      expect(identifierNumber(identifierControlFor("foreign", "AB"))).toEqual({ passportNumber: true });
    });

    // The same value passes as a passport but fails as a national code —
    // proves the dispatch is real, not that both branches happen to agree.
    it("accepts a value under foreign that would be rejected under iranian, and vice versa", () => {
      expect(identifierNumber(identifierControlFor("foreign", "1234567890"))).toBeNull();
      expect(identifierNumber(identifierControlFor("iranian", "AB1234567"))).toEqual({
        iranianNationalCode: true,
      });
    });

    it("defaults to national-code validation when there is no parent (unattached control)", () => {
      expect(identifierNumber(new FormControl("1234567891", { nonNullable: true }))).toBeNull();
    });

    it("treats empty as valid regardless of nationality", () => {
      expect(identifierNumber(identifierControlFor("iranian", ""))).toBeNull();
      expect(identifierNumber(identifierControlFor("foreign", ""))).toBeNull();
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
