import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientContact } from "./patient-contact.entity";

describe("PatientContact", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  it("creates a mobile_phone contact and canonicalizes the number", () => {
    const contact = PatientContact.create({
      id,
      patientId,
      rawMobileNumber: "09123456789",
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
      rawMobileNumber: "۰۹۱۲۳۴۵۶۷۸۹",
      createdBy,
      now,
    });
    expect(contact.originalValue).toBe("۰۹۱۲۳۴۵۶۷۸۹");
    expect(contact.normalizedValue).toBe("+989123456789");
  });

  it("rejects a value that isn't a recognizable Iranian mobile number", () => {
    expect(() =>
      PatientContact.create({ id, patientId, rawMobileNumber: "02112345678", createdBy, now }),
    ).toThrow(/not a recognizable Iranian mobile number/i);
  });
});
