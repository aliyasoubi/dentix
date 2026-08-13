import { config } from "dotenv";
import { join } from "path";
import { Client } from "pg";
import { DataSource } from "typeorm";
import { findRepoRoot } from "../../src/platform/find-repo-root";
import { dataSourceOptions } from "../../src/persistence/data-source";
import { resolveTestDatabaseName } from "./test-database";

/**
 * Jest globalSetup for the integration/api suites: makes sure the dedicated
 * test database exists and is migrated before any worker starts.
 *
 * Runs once, in its own process (so nothing it does leaks into workers —
 * the per-worker POSTGRES_DB override lives in set-test-database-env.ts).
 * Both halves are idempotent: CREATE DATABASE only fires when pg_database
 * has no row for the name, and runMigrations() applies only pending
 * migrations, so steady-state cost after the first run is two fast queries.
 */
export default async function globalSetup(): Promise<void> {
  const repoRoot = findRepoRoot(__dirname);
  if (repoRoot) {
    config({ path: join(repoRoot, ".env"), quiet: true });
  }

  const testDatabase = resolveTestDatabaseName();

  // dataSourceOptions was materialized with the *dev* POSTGRES_DB — exactly
  // what we must not touch. Only host/port/credentials are reused; the
  // maintenance connection targets Postgres' always-present "postgres" DB
  // because CREATE DATABASE can't run from inside the database being created.
  const { host, port, username, password } = dataSourceOptions as {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };

  const maintenance = new Client({ host, port, user: username, password, database: "postgres" });
  await maintenance.connect();
  try {
    const existing = await maintenance.query("SELECT 1 FROM pg_database WHERE datname = $1", [testDatabase]);
    if (existing.rowCount === 0) {
      // Identifier, not a value — can't be parameterized. Safe to interpolate
      // only because resolveTestDatabaseName() already constrains the name.
      await maintenance.query(`CREATE DATABASE "${testDatabase}"`);
    }
  } finally {
    await maintenance.end();
  }

  const migrator = new DataSource({ ...dataSourceOptions, database: testDatabase });
  await migrator.initialize();
  try {
    await migrator.runMigrations();
  } finally {
    await migrator.destroy();
  }
}
