import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientContact } from "./patient-contact.entity";

describe("PatientContact", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  describe("mobile_phone", () => {
    it("creates a mobile_phone contact and canonicalizes the number", () => {
      const contact = PatientContact.create({
        id,
        patientId,
        contactType: "mobile_phone",
        rawValue: "09123456789",
        createdBy,
        now,
      });
      expect(contact.contactType).toBe("mobile_phone");
      expect(contact.originalValue).toBe("09123456789");
      expect(contact.normalizedValue).toBe("+989123456789");
      expect(contact.isPreferred).toBe(true);
    });

    it("preserves the original value exactly as entered, including a Persian-digit form", () => {
      const contact = PatientContact.create({
        id,
        patientId,
        contactType: "mobile_phone",
        rawValue: "۰۹۱۲۳۴۵۶۷۸۹",
        createdBy,
        now,
      });
      expect(contact.originalValue).toBe("۰۹۱۲۳۴۵۶۷۸۹");
      expect(contact.normalizedValue).toBe("+989123456789");
    });

    it("rejects a value that isn't a recognizable Iranian mobile number", () => {
      expect(() =>
        PatientContact.create({
          id,
          patientId,
          contactType: "mobile_phone",
          rawValue: "02112345678",
          createdBy,
          now,
        }),
      ).toThrow(/not a recognizable Iranian mobile number/i);
    });
  });

  describe("email", () => {
    it("creates an email contact and canonicalizes the value", () => {
      const contact = PatientContact.create({
        id,
        patientId,
        contactType: "email",
        rawValue: "Zahra.Karimi@Example.com",
        createdBy,
        now,
      });
      expect(contact.contactType).toBe("email");
      expect(contact.originalValue).toBe("Zahra.Karimi@Example.com");
      expect(contact.normalizedValue).toBe("zahra.karimi@example.com");
      expect(contact.isPreferred).toBe(true);
    });

    it("rejects a value that isn't a recognizable email address", () => {
      expect(() =>
        PatientContact.create({
          id,
          patientId,
          contactType: "email",
          rawValue: "not-an-email",
          createdBy,
          now,
        }),
      ).toThrow(/not a recognizable email address/i);
    });

    // The same digits-and-letters string a mobile number could shape-match
    // must not be silently reinterpreted — the caller's declared
    // contactType is authoritative, matching PatientIdentifier's own rule.
    it("does not fall back to mobile-number validation", () => {
      expect(() =>
        PatientContact.create({
          id,
          patientId,
          contactType: "email",
          rawValue: "09123456789",
          createdBy,
          now,
        }),
      ).toThrow(/not a recognizable email address/i);
    });
  });
});
