import "reflect-metadata";
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { DataSource, DataSourceOptions } from "typeorm";
import { APP_ENTITIES } from "./entity-registry";

/**
 * Walks up from `startDir` to find the monorepo root, identified by
 * `docker-compose.yml` (a real, stable, root-only file). A fixed
 * `../../../../` hop count would be correct from ts-node/ts-jest (running
 * against source, e.g. `apps/api/src/persistence`) but wrong from the
 * compiled build (`apps/api/dist/src/persistence` — `rootDir: "."` adds an
 * extra nesting level), silently landing one directory short with no
 * error since every field below has a fallback default. Walking up to a
 * known anchor is correct from both locations without needing to know
 * which one `__dirname` is.
 */
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (!existsSync(join(dir, "docker-compose.yml"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate repo root (docker-compose.yml) above ${startDir}`);
    }
    dir = parent;
  }
  return dir;
}

// One shared .env at the repo root (matches docker-compose.yml, which also
// lives there) — loaded explicitly so this resolves the same whether the
// command runs from the repo root, from inside apps/api, or from the
// compiled dist/ output.
// quiet: true - dotenv prints promotional "tip" lines to stdout by default
// on every load, including in production; that's not something we want in
// application logs (05-quality/01-security-privacy.md's log-cleanliness bar).
config({ path: join(findRepoRoot(__dirname), ".env"), quiet: true });

/**
 * Migration-only mode (ADR-006): `synchronize` is false in every
 * environment, including local dev. Used both by the NestJS app (via
 * TypeOrmModule.forRoot, see app.module.ts) and by the
 * `typeorm-ts-node-commonjs` CLI for db:migrate / db:migrate:down.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5433),
  username: process.env.POSTGRES_USER ?? "dentix",
  password: process.env.POSTGRES_PASSWORD ?? "dentix_dev_only",
  database: process.env.POSTGRES_DB ?? "dentix",
  synchronize: false,
  entities: [...APP_ENTITIES],
  migrations: [__dirname + "/migrations/*.{ts,js}"],
  migrationsTableName: "migration_history",
};

export default new DataSource(dataSourceOptions);
