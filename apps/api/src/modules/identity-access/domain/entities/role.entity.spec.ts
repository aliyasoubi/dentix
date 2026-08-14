import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { Role } from "./role.entity";

describe("Role", () => {
  const id = asUuid(randomUUID());
  const officeId = asUuid(randomUUID());

  it("creates a role with a code and name", () => {
    const role = Role.create({ id, officeId, code: "dentist", name: "Dentist" });
    expect(role.code).toBe("dentist");
    expect(role.name).toBe("Dentist");
    expect(role.officeId).toBe(officeId);
  });

  it("rejects an empty code", () => {
    expect(() => Role.create({ id, officeId, code: "  ", name: "Dentist" })).toThrow(/code/i);
  });

  it("rejects an empty name", () => {
    expect(() => Role.create({ id, officeId, code: "dentist", name: " " })).toThrow(/name/i);
  });
});
