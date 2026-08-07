import { asUuid, isUuid } from "./identifiers";

describe("identifiers", () => {
  it("accepts a well-formed v4 UUID", () => {
    expect(isUuid("2f0a6b0e-6b8c-4a1a-9b0a-0b1c2d3e4f5a")).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("throws when asUuid receives an invalid string", () => {
    expect(() => asUuid("not-a-uuid")).toThrow();
  });
});
