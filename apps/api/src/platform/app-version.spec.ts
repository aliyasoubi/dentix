import { join } from "path";
import { readAppVersion } from "./app-version";

describe("readAppVersion", () => {
  it("finds @dentix/api's package.json walking up from a nested source directory", () => {
    expect(readAppVersion(__dirname)).toBe("0.5.0");
  });

  it("finds it walking up from a directory nested even deeper (simulating dist/src/platform)", () => {
    expect(readAppVersion(join(__dirname, "dto"))).toBe("0.5.0");
  });

  it("throws when walking up never finds @dentix/api's package.json", () => {
    expect(() => readAppVersion("/tmp")).toThrow(/Could not locate/);
  });
});
