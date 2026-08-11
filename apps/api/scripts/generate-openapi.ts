import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";

/**
 * 05-api-guidelines.md: "OpenAPI generated and checked in CI". Boots the
 * real AppModule (so the document reflects exactly what's mounted, not a
 * hand-maintained subset) against the dev/CI Postgres — same DB dependency
 * `npm run test:int`/`test:api` already have, nothing new. Never starts an
 * HTTP listener; only the in-memory document is needed.
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  const config = new DocumentBuilder()
    .setTitle("Dentix API")
    .setDescription("Farsi-first single-office dental PMS — REST contract (05-api-guidelines.md)")
    .setVersion("0.5.0")
    .addCookieAuth("__Host-dentix_session")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = join(__dirname, "..", "openapi.json");
  writeFileSync(outPath, JSON.stringify(document, null, 2) + "\n", "utf8");

  await app.close();
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
