import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { Patient } from "./patient.entity";

describe("Patient", () => {
  const id = asUuid(randomUUID());
  const officeId = asUuid(randomUUID());
  const createdBy = asUuid(randomUUID());
  const now = new Date();

  it("creates an active patient with version 1 and no archive fields", () => {
    const patient = Patient.create({
      id,
      officeId,
      patientNumber: 1,
      dateOfBirth: null,
      sex: "unspecified",
      contactUnavailable: false,
      createdBy,
      now,
    });
    expect(patient.status).toBe("active");
    expect(patient.version).toBe(1);
    expect(patient.patientNumber).toBe(1);
    expect(patient.dateOfBirth).toBeNull();
    expect(patient.createdBy).toBe(createdBy);
  });
});
