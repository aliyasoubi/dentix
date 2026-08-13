import { resolveTestDatabaseName } from "./test-database";

// Jest `setupFiles` entry — runs in every worker before any test module
// loads. Ordering is the whole trick: data-source.ts reads POSTGRES_DB at
// import time, and dotenv's config() never overrides a key that is already
// present in process.env. Setting it here therefore beats both the repo-root
// .env file and any shell/CI-level POSTGRES_DB (CI exports POSTGRES_DB=dentix
// job-wide for the migration-proof step; that must not leak into the suites).
process.env.POSTGRES_DB = resolveTestDatabaseName();
