import { resolveTestDatabaseName } from "./test-database";

// Named .int-spec.ts to be picked up by jest-int.json (apps/api's default
// unit config only scans src/) even though this specific spec is a pure
// function test with no Postgres dependency — it verifies the guard that
// protects the real database the rest of this suite's specs run against.
describe("resolveTestDatabaseName", () => {
  const originalEnv = process.env.POSTGRES_TEST_DB;

  afterEach(() => {
    process.env.POSTGRES_TEST_DB = originalEnv;
  });

  it("defaults to dentix_test", () => {
    delete process.env.POSTGRES_TEST_DB;
    expect(resolveTestDatabaseName()).toBe("dentix_test");
  });

  it("accepts an override that ends with _test", () => {
    process.env.POSTGRES_TEST_DB = "dentix_ci_test";
    expect(resolveTestDatabaseName()).toBe("dentix_ci_test");
  });

  // The one behavior this module exists for: a destructive suite must never
  // be able to silently target the shared dev/prod-shaped database.
  it("refuses a name that doesn't end with _test, even if it's dentix itself", () => {
    process.env.POSTGRES_TEST_DB = "dentix";
    expect(() => resolveTestDatabaseName()).toThrow(/_test/);
  });
});
