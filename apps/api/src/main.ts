import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { buildOpenApiDocument } from "./platform/openapi-document";

// API guidelines (04-architecture/05-api-guidelines.md): URL prefix /api/v1.
// /health stays unversioned for liveness probes and the S9 smoke script.
async function bootstrap() {
  // Typed as the Express application rather than the generic one so `set()`
  // below is a real typed method — getHttpAdapter().getInstance() returns
  // `any`, which CLAUDE.md's "no `any` outside audited adapters" rules out.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Session and CSRF cookies are read directly off the request
  // (09-authentication-session-architecture.md) — no signing secret here,
  // the cookie only ever carries an opaque token that's hashed before any
  // lookup, so there's nothing a signature would protect that hashing
  // doesn't already.
  app.use(cookieParser());

  // ADR-010's target deployment puts a reverse proxy (nginx/Caddy) in front
  // of this process. Without trust proxy, Express reports the *proxy's* IP as
  // req.ip, so ThrottlerGuard buckets every user in the office into a single
  // rate limit on /auth/login and /auth/callback — one person's redirect loop
  // would lock out everyone, and no individual attacker is ever isolated.
  //
  // Opt-in rather than on by default, and that direction matters: trusting
  // X-Forwarded-For when nothing is actually in front lets a caller spoof the
  // header and hand themselves a fresh rate-limit bucket per request. The
  // value is the number of proxy hops (usually 1).
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
  }

  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  // Dev/staging convenience only — a browsable API reference.
  //
  // Explicit opt-in, NOT `NODE_ENV !== "production"`. That earlier gate was
  // fail-open and would have shipped /api/docs to production: NODE_ENV is
  // set nowhere in this repo, and `start:prod` is a bare `node dist/src/main`,
  // so process.env.NODE_ENV is undefined and `undefined !== "production"`
  // is true. A gate protecting an externally reachable surface has to fail
  // closed — an operator who sets nothing gets no docs endpoint.
  //
  // Known, evaluated dependency finding (not blocking): @nestjs/swagger@11.4.6
  // pins js-yaml@5.2.1, which carries GHSA-pm4m-ph32-ghv5 (parser DoS via
  // exponential-time flow collections). A `package.json` override to the
  // patched 5.2.3 was tried and reverted — reproducibly refused by npm across
  // three independent clean-install attempts (npm ls kept reporting the
  // pre-override version as "invalid", even from a fully cold cache with the
  // lockfile deleted), and no @nestjs/swagger release exists yet that bumps
  // it. Not exploitable here regardless: SwaggerModule's only js-yaml call is
  // `jsyaml.dump()` on this app's own generated document, at the
  // `-yaml`-suffixed variant of this route — the CVE is in the *parser*
  // (`.load()`/`.loadAll()`), which this codebase never calls with any
  // input, let alone external input. Revisit when @nestjs/swagger ships a fix.
  if (process.env.ENABLE_API_DOCS === "true") {
    SwaggerModule.setup("api/docs", app, buildOpenApiDocument(app));
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
