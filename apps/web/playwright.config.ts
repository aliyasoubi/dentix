import { defineConfig } from "@playwright/test";

/**
 * S4's E2E journey (02-slices-release-0.5.md): login -> create patient
 * (Persian + Latin name) -> find via search in three phone/digit forms.
 * Same-origin app+API stack must already be running (docker compose up
 * -d, npm run start:dev, apps/web built) — this doesn't spin up Postgres/
 * Keycloak itself, matching how test:int/test:api already assume the
 * Compose stack is up rather than trying to orchestrate it.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
