import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

// API guidelines (04-architecture/05-api-guidelines.md): URL prefix /api/v1.
// /health stays unversioned for liveness probes and the S9 smoke script.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Session and CSRF cookies are read directly off the request
  // (09-authentication-session-architecture.md) — no signing secret here,
  // the cookie only ever carries an opaque token that's hashed before any
  // lookup, so there's nothing a signature would protect that hashing
  // doesn't already.
  app.use(cookieParser());
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
