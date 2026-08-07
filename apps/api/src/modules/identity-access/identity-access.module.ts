import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OFFICE_USER_REPOSITORY } from "./domain/repositories/office-user.repository";
import { OIDC_AUTHORIZATION_REQUEST_REPOSITORY } from "./domain/repositories/oidc-authorization-request.repository";
import { USER_ACCOUNT_REPOSITORY } from "./domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "./domain/repositories/user-session.repository";
import { EnvelopeEncryptionService } from "./infrastructure/crypto/envelope-encryption.service";
import { SessionTokenService } from "./infrastructure/crypto/session-token.service";
import { OfficeUserOrmEntity } from "./infrastructure/persistence/office-user.orm-entity";
import { TypeOrmOfficeUserRepository } from "./infrastructure/persistence/office-user.typeorm-repository";
import { OidcAuthorizationRequestOrmEntity } from "./infrastructure/persistence/oidc-authorization-request.orm-entity";
import { TypeOrmOidcAuthorizationRequestRepository } from "./infrastructure/persistence/oidc-authorization-request.typeorm-repository";
import { UserAccountOrmEntity } from "./infrastructure/persistence/user-account.orm-entity";
import { TypeOrmUserAccountRepository } from "./infrastructure/persistence/user-account.typeorm-repository";
import { UserSessionOrmEntity } from "./infrastructure/persistence/user-session.orm-entity";
import { TypeOrmUserSessionRepository } from "./infrastructure/persistence/user-session.typeorm-repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserAccountOrmEntity,
      OfficeUserOrmEntity,
      UserSessionOrmEntity,
      OidcAuthorizationRequestOrmEntity,
    ]),
  ],
  providers: [
    SessionTokenService,
    EnvelopeEncryptionService,
    { provide: USER_ACCOUNT_REPOSITORY, useClass: TypeOrmUserAccountRepository },
    { provide: OFFICE_USER_REPOSITORY, useClass: TypeOrmOfficeUserRepository },
    { provide: USER_SESSION_REPOSITORY, useClass: TypeOrmUserSessionRepository },
    { provide: OIDC_AUTHORIZATION_REQUEST_REPOSITORY, useClass: TypeOrmOidcAuthorizationRequestRepository },
  ],
  exports: [
    SessionTokenService,
    EnvelopeEncryptionService,
    USER_ACCOUNT_REPOSITORY,
    OFFICE_USER_REPOSITORY,
    USER_SESSION_REPOSITORY,
    OIDC_AUTHORIZATION_REQUEST_REPOSITORY,
  ],
})
export class IdentityAccessModule {}
