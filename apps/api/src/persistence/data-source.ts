import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "path";
import { DataSource, DataSourceOptions } from "typeorm";
import { APP_ENTITIES } from "./entities";

// One shared .env at the repo root (matches docker-compose.yml, which also
// lives there) — loaded explicitly so this resolves the same whether the
// command runs from the repo root or from inside apps/api.
// quiet: true - dotenv prints promotional "tip" lines to stdout by default
// on every load, including in production; that's not something we want in
// application logs (05-quality/01-security-privacy.md's log-cleanliness bar).
config({ path: resolve(__dirname, "../../../../.env"), quiet: true });

/**
 * Migration-only mode (ADR-006): `synchronize` is false in every
 * environment, including local dev. Used both by the NestJS app
 * (via TypeOrmModule.forRootAsync, see app.module.ts) and by the
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
