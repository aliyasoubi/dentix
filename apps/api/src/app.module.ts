import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { HealthController } from "./health.controller";
import { IdentityAccessModule } from "./modules/identity-access/identity-access.module";
import { OfficeAdministrationModule } from "./modules/office-administration/office-administration.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { findRepoRoot } from "./platform/find-repo-root";
import { dataSourceOptions } from "./persistence/data-source";

// Same-origin by design (09-authentication-session-architecture.md:
// "Browser API calls use the same origin; CORS is disabled by default")
// — the __Host- session cookie and CsrfGuard's Origin check both depend
// on it. In the ADR-010 target deployment a reverse proxy (nginx/Caddy)
// presents that single origin, serving the built Angular app itself and
// only forwarding /api to this process — this module wouldn't even see
// static-asset requests there. Locally there's no reverse proxy yet, so
// this process serves apps/web's build directly, on the same origin the
// whole OIDC flow already assumes. Falls back to __dirname (an unbuilt
// apps/web/dist is a normal state — `npm run build` hasn't run yet — 404s
// on unknown paths, not a startup crash) when the repo root can't be
// found, same reasoning as data-source.ts.
const repoRoot = findRepoRoot(__dirname);
const webBuildRoot = repoRoot ? join(repoRoot, "apps", "web", "dist", "web", "browser") : join(__dirname);

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions),
    ServeStaticModule.forRoot({
      rootPath: webBuildRoot,
      exclude: ["/api/{*splat}", "/health"],
    }),
    OfficeAdministrationModule,
    IdentityAccessModule,
    PatientsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
