/**
 * Single source of truth for which database the integration/api suites hit.
 *
 * Why this exists: the suites TRUNCATE tables between cases. They used to do
 * that against the same `dentix` database the interactive dev app uses, so
 * every `npm run test:int` silently wiped the dev login (office, office_user,
 * user_account) — a footgun that bit four times in one working session and
 * would eventually hit data someone cared about. Tests now run against a
 * dedicated database on the same Postgres instance.
 */
export function resolveTestDatabaseName(): string {
  const name = process.env.POSTGRES_TEST_DB ?? "dentix_test";
  // Hard invariant rather than a convention: the whole point of this module
  // is that a destructive suite can never point at a database that isn't
  // visibly a test one. POSTGRES_TEST_DB=dentix must fail loudly, not wipe
  // dev data quietly.
  if (!name.endsWith("_test")) {
    throw new Error(
      `POSTGRES_TEST_DB must end with "_test" (got "${name}") — integration tests TRUNCATE tables and must never target a shared database.`,
    );
  }
  return name;
}
