import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientIdentifier } from "./patient-identifier.entity";

describe("PatientIdentifier", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  describe("national_code", () => {
    it("creates a national_code identifier and canonicalizes the value", () => {
      const identifier = PatientIdentifier.create({
        id,
        patientId,
        identifierType: "national_code",
        rawValue: "1234567891",
        createdBy,
        now,
      });
      expect(identifier.identifierType).toBe("national_code");
      expect(identifier.originalValue).toBe("1234567891");
      expect(identifier.normalizedValue).toBe("1234567891");
    });

    it("preserves the original value exactly as entered, including a Persian-digit form", () => {
      const identifier = PatientIdentifier.create({
        id,
        patientId,
        identifierType: "national_code",
        rawValue: "۱۲۳۴۵۶۷۸۹۱",
        createdBy,
        now,
      });
      expect(identifier.originalValue).toBe("۱۲۳۴۵۶۷۸۹۱");
      expect(identifier.normalizedValue).toBe("1234567891");
    });

    it("preserves an as-entered value missing its leading zeros, but normalizes the padded form", () => {
      const identifier = PatientIdentifier.create({
        id,
        patientId,
        identifierType: "national_code",
        rawValue: "12345679",
        createdBy,
        now,
      });
      expect(identifier.originalValue).toBe("12345679");
      expect(identifier.normalizedValue).toBe("0012345679");
    });

    it("rejects a value that isn't a checksum-valid Iranian national code", () => {
      expect(() =>
        PatientIdentifier.create({
          id,
          patientId,
          identifierType: "national_code",
          rawValue: "1234567890",
          createdBy,
          now,
        }),
      ).toThrow(/not a checksum-valid Iranian national code/i);
    });
  });

  describe("passport", () => {
    it("creates a passport identifier and canonicalizes the value", () => {
      const identifier = PatientIdentifier.create({
        id,
        patientId,
        identifierType: "passport",
        rawValue: "ab1234567",
        createdBy,
        now,
      });
      expect(identifier.identifierType).toBe("passport");
      expect(identifier.originalValue).toBe("ab1234567");
      expect(identifier.normalizedValue).toBe("AB1234567");
    });

    it("rejects a value outside the passport-number length range", () => {
      expect(() =>
        PatientIdentifier.create({
          id,
          patientId,
          identifierType: "passport",
          rawValue: "AB",
          createdBy,
          now,
        }),
      ).toThrow(/not a recognizable passport number/i);
    });

    // The same 10-digit value that is checksum-valid as a national code
    // must not be silently reinterpreted — the caller's declared
    // identifierType is authoritative, not inferred from the shape.
    it("does not fall back to national-code validation for an all-digit value", () => {
      const identifier = PatientIdentifier.create({
        id,
        patientId,
        identifierType: "passport",
        rawValue: "1234567891",
        createdBy,
        now,
      });
      expect(identifier.identifierType).toBe("passport");
      expect(identifier.normalizedValue).toBe("1234567891");
    });
  });
});
