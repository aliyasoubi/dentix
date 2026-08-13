import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { VALIDATION_PIPE_OPTIONS } from "./platform/validation.pipe-options";
import { BootstrapController } from "./bootstrap.controller";
import { HealthController } from "./health.controller";
import { IdentityAccessModule } from "./modules/identity-access/identity-access.module";
import { OfficeAdministrationModule } from "./modules/office-administration/office-administration.module";
import { OutboxModule } from "./modules/outbox/outbox.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { findRepoRoot } from "./platform/find-repo-root";
import { dataSourceOptions } from "./persistence/data-source";

// Same-origin by design (09-authentication-session-architecture.md:
// "Browser API calls use the same origin; CORS is disabled by default")
// — the __Host- session cookie and CsrfGuard's Origin check both depend
// on it. The ADR-010 reverse proxy (Caddy) terminates TLS and presents
// that single origin, but it forwards *everything* to this process rather
// than serving the bundle itself, so this module is what actually serves
// the Angular app in every environment — one code path, dev and
// production, instead of a static-file arrangement that only exists in
// one of them.
//
// Resolution order matters. WEB_BUILD_ROOT wins because a container image
// is precisely the case the repo-walk cannot handle: findRepoRoot() keys
// off docker-compose.yml, a dev-only file that must never ship in an
// image, so inside the container the walk correctly finds nothing. Without
// the override the fallback below would resolve to __dirname, quietly
// serving 404s for every UI route while the API itself looked healthy.
// The walk stays as the dev default so nobody has to set an env var to
// run locally. Final fallback is __dirname: an unbuilt apps/web/dist is a
// normal state (`npm run build` hasn't run yet) and should 404 on unknown
// paths, not crash at startup — same reasoning as data-source.ts.
const repoRoot = findRepoRoot(__dirname);
const webBuildRoot =
  process.env.WEB_BUILD_ROOT ??
  (repoRoot ? join(repoRoot, "apps", "web", "dist", "web", "browser") : join(__dirname));

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    ServeStaticModule.forRoot({
      rootPath: webBuildRoot,
      exclude: ["/api/{*splat}", "/health"],
    }),
    OfficeAdministrationModule,
    OutboxModule,
    IdentityAccessModule,
    PatientsModule,
  ],
  controllers: [HealthController, BootstrapController],
  providers: [
    // Registered here rather than via main.ts's useGlobalPipes on purpose:
    // every api-spec builds its own app from AppModule, so an entry-point-only
    // pipe would leave the tests exercising a different request pipeline than
    // production — which is exactly how "no validation at all" went unnoticed
    // by a green suite. As an APP_PIPE it is part of the module, so anything
    // that boots AppModule gets it.
    { provide: APP_PIPE, useValue: new ValidationPipe(VALIDATION_PIPE_OPTIONS) },
  ],
})
export class AppModule {}
