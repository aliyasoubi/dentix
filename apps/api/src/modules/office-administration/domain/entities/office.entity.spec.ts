import { asUuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { Office } from "./office.entity";

describe("Office", () => {
  const id = asUuid(randomUUID());

  it("creates an active office at version 1", () => {
    const office = Office.create({ id, code: "main", timezone: "Asia/Tehran" });
    expect(office.isActive).toBe(true);
    expect(office.version).toBe(1);
    expect(office.code).toBe("main");
  });

  it("rejects an empty code", () => {
    expect(() => Office.create({ id, code: "  ", timezone: "Asia/Tehran" })).toThrow(
      /code must not be empty/i,
    );
  });

  it("rejects a timezone that isn't a real IANA zone", () => {
    expect(() => Office.create({ id, code: "main", timezone: "Asia/Teheran" })).toThrow(
      /valid IANA zone identifier/i,
    );
  });

  it("rejects an empty timezone", () => {
    expect(() => Office.create({ id, code: "main", timezone: "" })).toThrow(/valid IANA zone identifier/i);
  });

  it("accepts other real IANA zones, not just Asia/Tehran", () => {
    expect(() => Office.create({ id, code: "main", timezone: "UTC" })).not.toThrow();
    expect(() => Office.create({ id, code: "main", timezone: "America/New_York" })).not.toThrow();
  });

  it("reconstitute does not re-run creation validation", () => {
    // Reading a persisted row back must never throw on historical data,
    // even if validation rules tighten later.
    expect(() =>
      Office.reconstitute({ id, code: "main", timezone: "Asia/Tehran", isActive: true, version: 3 }),
    ).not.toThrow();
  });
});
