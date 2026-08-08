import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/public-api";
import { TypeOrmUnitOfWork } from "../../platform/typeorm-unit-of-work";
import { UNIT_OF_WORK_PORT } from "../../platform/unit-of-work.port";
import { CompleteLoginUseCase } from "./application/use-cases/complete-login.use-case";
import { GetSessionUseCase } from "./application/use-cases/get-session.use-case";
import { LogoutUseCase } from "./application/use-cases/logout.use-case";
import { ResolveActiveSessionUseCase } from "./application/use-cases/resolve-active-session.use-case";
import { StartLoginUseCase } from "./application/use-cases/start-login.use-case";
import { OFFICE_USER_REPOSITORY } from "./domain/repositories/office-user.repository";
import { OIDC_AUTHORIZATION_REQUEST_REPOSITORY } from "./domain/repositories/oidc-authorization-request.repository";
import { USER_ACCOUNT_REPOSITORY } from "./domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "./domain/repositories/user-session.repository";
import { ENCRYPTION_PORT } from "./application/ports/encryption.port";
import { OIDC_CLIENT_PORT } from "./application/ports/oidc-client.port";
import { SESSION_TOKEN_PORT } from "./application/ports/session-token.port";
import { EnvelopeEncryptionService } from "./infrastructure/crypto/envelope-encryption.service";
import { SessionTokenService } from "./infrastructure/crypto/session-token.service";
import { OpenIdClientAdapter } from "./infrastructure/oidc/openid-client.adapter";
import { OfficeUserOrmEntity } from "./infrastructure/persistence/office-user.orm-entity";
import { TypeOrmOfficeUserRepository } from "./infrastructure/persistence/office-user.typeorm-repository";
import { OidcAuthorizationRequestOrmEntity } from "./infrastructure/persistence/oidc-authorization-request.orm-entity";
import { TypeOrmOidcAuthorizationRequestRepository } from "./infrastructure/persistence/oidc-authorization-request.typeorm-repository";
import { UserAccountOrmEntity } from "./infrastructure/persistence/user-account.orm-entity";
import { TypeOrmUserAccountRepository } from "./infrastructure/persistence/user-account.typeorm-repository";
import { UserSessionOrmEntity } from "./infrastructure/persistence/user-session.orm-entity";
import { TypeOrmUserSessionRepository } from "./infrastructure/persistence/user-session.typeorm-repository";
import { AuthController } from "./presentation/http/auth.controller";
import { CsrfGuard } from "./presentation/guards/csrf.guard";
import { SessionGuard } from "./presentation/guards/session.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAccountOrmEntity,
      OfficeUserOrmEntity,
      UserSessionOrmEntity,
      OidcAuthorizationRequestOrmEntity,
    ]),
    AuditModule,
    // Applied per-route (login/callback only, see auth.controller.ts) —
    // not global, so it doesn't affect whoami/logout, which a legitimate
    // SPA calls far more often. Defense-in-depth alongside Keycloak's own
    // brute-force protection (ADR-007): this limits abuse of Dentix's own
    // side of the flow (authorization-request row creation, code/state
    // guessing) independent of what the provider does.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
  ],
  controllers: [AuthController],
  providers: [
    // Registered under both their concrete class (presentation/guards uses
    // these directly — HTTP-layer plumbing, not application logic) and
    // their port token (application/use-cases only ever sees the port).
    // useExisting, not useClass, for the port bindings: one singleton
    // instance behind both tokens, not two.
    SessionTokenService,
    EnvelopeEncryptionService,
    { provide: SESSION_TOKEN_PORT, useExisting: SessionTokenService },
    { provide: ENCRYPTION_PORT, useExisting: EnvelopeEncryptionService },
    { provide: USER_ACCOUNT_REPOSITORY, useClass: TypeOrmUserAccountRepository },
    { provide: OFFICE_USER_REPOSITORY, useClass: TypeOrmOfficeUserRepository },
    { provide: USER_SESSION_REPOSITORY, useClass: TypeOrmUserSessionRepository },
    { provide: OIDC_AUTHORIZATION_REQUEST_REPOSITORY, useClass: TypeOrmOidcAuthorizationRequestRepository },
    { provide: UNIT_OF_WORK_PORT, useClass: TypeOrmUnitOfWork },
    { provide: OIDC_CLIENT_PORT, useClass: OpenIdClientAdapter },
    StartLoginUseCase,
    CompleteLoginUseCase,
    ResolveActiveSessionUseCase,
    GetSessionUseCase,
    LogoutUseCase,
    SessionGuard,
    CsrfGuard,
    ThrottlerGuard,
  ],
  exports: [
    SessionTokenService,
    EnvelopeEncryptionService,
    USER_ACCOUNT_REPOSITORY,
    OFFICE_USER_REPOSITORY,
    USER_SESSION_REPOSITORY,
    OIDC_AUTHORIZATION_REQUEST_REPOSITORY,
    // SessionGuard/CsrfGuard used cross-module via @UseGuards() are
    // resolved by Nest through the CONSUMING controller's own module
    // (Injector.loadInjectable uses that module's injector, not the
    // guard's origin module) — so every one of their own constructor
    // dependencies must ALSO be reachable from there, not just the guard
    // classes themselves. ResolveActiveSessionUseCase and the two port
    // tokens below are exported for exactly that reason, not because
    // another module has any business calling them directly.
    ResolveActiveSessionUseCase,
    SESSION_TOKEN_PORT,
    UNIT_OF_WORK_PORT,
    SessionGuard,
    CsrfGuard,
  ],
})
export class IdentityAccessModule {}
