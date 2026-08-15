import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientIdentifier } from "./patient-identifier.entity";

describe("PatientIdentifier", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  it("creates a national_code identifier and canonicalizes the value", () => {
    const identifier = PatientIdentifier.create({
      id,
      patientId,
      rawNationalCode: "1234567891",
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
      rawNationalCode: "۱۲۳۴۵۶۷۸۹۱",
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
      rawNationalCode: "12345679",
      createdBy,
      now,
    });
    expect(identifier.originalValue).toBe("12345679");
    expect(identifier.normalizedValue).toBe("0012345679");
  });

  it("rejects a value that isn't a checksum-valid Iranian national code", () => {
    expect(() =>
      PatientIdentifier.create({ id, patientId, rawNationalCode: "1234567890", createdBy, now }),
    ).toThrow(/not a checksum-valid Iranian national code/i);
  });
});
