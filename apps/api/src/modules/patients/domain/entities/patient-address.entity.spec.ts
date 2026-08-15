import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientAddress } from "./patient-address.entity";

describe("PatientAddress", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  it("creates an address with structured Iranian fields, trimmed", () => {
    const address = PatientAddress.create({
      id,
      patientId,
      province: " تهران ",
      city: " تهران ",
      district: " ونک ",
      addressLine1: " خیابان ولیعصر ",
      addressLine2: " پلاک ۱۲ ",
      postalCode: " 1234567890 ",
      deliveryNotes: " زنگ واحد ۳ ",
      createdBy,
      now,
    });
    expect(address.province).toBe("تهران");
    expect(address.city).toBe("تهران");
    expect(address.district).toBe("ونک");
    expect(address.addressLine1).toBe("خیابان ولیعصر");
    expect(address.addressLine2).toBe("پلاک ۱۲");
    expect(address.postalCode).toBe("1234567890");
    expect(address.deliveryNotes).toBe("زنگ واحد ۳");
    expect(address.version).toBe(1);
  });

  it("normalizes an omitted or blank field to null rather than an empty string", () => {
    const address = PatientAddress.create({
      id,
      patientId,
      city: "   ",
      createdBy,
      now,
    });
    expect(address.province).toBeNull();
    expect(address.city).toBeNull();
    expect(address.district).toBeNull();
    expect(address.addressLine1).toBeNull();
  });

  describe("isEmpty", () => {
    it("is true when every field is blank or omitted", () => {
      const address = PatientAddress.create({ id, patientId, createdBy, now });
      expect(address.isEmpty).toBe(true);
    });

    it("is false when even one field has a value", () => {
      const address = PatientAddress.create({ id, patientId, postalCode: "1234567890", createdBy, now });
      expect(address.isEmpty).toBe(false);
    });
  });
});
