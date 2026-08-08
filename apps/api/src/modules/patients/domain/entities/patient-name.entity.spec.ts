import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { PatientName } from "./patient-name.entity";

describe("PatientName", () => {
  const id = asUuid(randomUUID());
  const patientId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  it("creates a current native name and normalizes it for search", () => {
    const name = PatientName.create({
      id,
      patientId,
      nameType: "native",
      value: "علي رضایی",
      createdBy,
      now,
    });
    expect(name.nameType).toBe("native");
    expect(name.originalValue).toBe("علي رضایی");
    expect(name.normalizedValue).toBe("علی رضایی");
    expect(name.isCurrent).toBe(true);
  });

  it("trims the original value", () => {
    const name = PatientName.create({
      id,
      patientId,
      nameType: "latin",
      value: "  Ali Rezaei  ",
      createdBy,
      now,
    });
    expect(name.originalValue).toBe("Ali Rezaei");
  });

  it("normalizes Latin names case-insensitively", () => {
    const name = PatientName.create({
      id,
      patientId,
      nameType: "latin",
      value: "Ali REZAEI",
      createdBy,
      now,
    });
    expect(name.normalizedValue).toBe("ali rezaei");
  });

  it("rejects an empty value", () => {
    expect(() =>
      PatientName.create({ id, patientId, nameType: "native", value: "   ", createdBy, now }),
    ).toThrow(/must not be empty/i);
  });
});
