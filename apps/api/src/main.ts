import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// API guidelines (04-architecture/05-api-guidelines.md): URL prefix /api/v1.
// /health stays unversioned for liveness probes and the S9 smoke script.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
