import { fail, ok } from "./result";

describe("Result", () => {
  it("wraps a success value", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toBe(42);
  });

  it("wraps a stable failure code with optional details", () => {
    const result = fail("APPOINTMENT_CONFLICT", { conflictingAppointmentIds: ["a", "b"] });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("APPOINTMENT_CONFLICT");
    expect(!result.ok && result.details).toEqual({ conflictingAppointmentIds: ["a", "b"] });
  });
});
