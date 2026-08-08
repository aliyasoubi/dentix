import { randomUUID } from "crypto";
import { asUuid } from "@dentix/kernel";
import { CompleteLoginUseCase } from "./complete-login.use-case";
import { OidcAuthorizationRequest } from "../../domain/entities/oidc-authorization-request.entity";
import { UserAccount } from "../../domain/entities/user-account.entity";
import { OfficeUser } from "../../domain/entities/office-user.entity";
import { UserSession } from "../../domain/entities/user-session.entity";
import type { OidcAuthorizationRequestRepository } from "../../domain/repositories/oidc-authorization-request.repository";
import type { UserAccountRepository } from "../../domain/repositories/user-account.repository";
import type { OfficeUserRepository } from "../../domain/repositories/office-user.repository";
import type { AuditEventRepository } from "../../domain/repositories/audit-event.repository";
import type { OidcClientPort, ExchangedIdentity } from "../ports/oidc-client.port";
import type { SessionTokenPort } from "../ports/session-token.port";
import type { EncryptionPort } from "../ports/encryption.port";
import type { UnitOfWorkPort } from "../ports/unit-of-work.port";

describe("CompleteLoginUseCase — auth_time enforcement and mfaContext derivation", () => {
  const issuer = "https://kc.local/realms/test";
  const subject = "kc-sub-1";

  function buildRequest(): OidcAuthorizationRequest {
    return OidcAuthorizationRequest.create({
      id: asUuid(randomUUID()),
      stateHash: "state-hash",
      nonceEncrypted: "encrypted-nonce",
      pkceVerifierEncrypted: "encrypted-verifier",
      returnPath: "/dashboard",
      now: new Date(),
    });
  }

  function buildUseCase(identity: ExchangedIdentity): {
    useCase: CompleteLoginUseCase;
    sessions: {
      findByHash: jest.Mock;
      create: jest.Mock<Promise<void>, [UserSession]>;
      touchIfActive: jest.Mock;
      revoke: jest.Mock;
    };
  } {
    const request = buildRequest();
    const account = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: subject,
      issuer,
      displayName: "Test User",
    });
    const officeUser = OfficeUser.reconstitute({
      id: asUuid(randomUUID()),
      officeId: asUuid(randomUUID()),
      userId: account.id,
      permissionVersion: 1,
      isActive: true,
    });

    const oidcClient: OidcClientPort = {
      buildAuthorizationUrl: jest.fn(),
      exchangeAuthorizationCode: jest.fn().mockResolvedValue(identity),
      buildEndSessionUrl: jest.fn(),
    };
    const requests: OidcAuthorizationRequestRepository = {
      findByStateHash: jest.fn().mockResolvedValue(request),
      create: jest.fn(),
      markUsed: jest.fn(),
    };
    const userAccounts: UserAccountRepository = {
      findByExternalIdentity: jest.fn().mockResolvedValue(account),
      findById: jest.fn(),
      create: jest.fn(),
    };
    const officeUsers: OfficeUserRepository = {
      findByUserId: jest.fn().mockResolvedValue(officeUser),
    };
    const sessions = {
      findByHash: jest.fn(),
      create: jest.fn<Promise<void>, [UserSession]>(),
      touchIfActive: jest.fn(),
      revoke: jest.fn(),
    };
    const sessionTokens: SessionTokenPort = {
      generateOpaqueToken: jest.fn().mockReturnValue("opaque-token"),
      hash: jest.fn().mockReturnValue("hashed"),
      generatePkcePair: jest.fn(),
    };
    const envelopeEncryption: EncryptionPort = {
      encrypt: jest.fn(),
      decrypt: jest.fn().mockReturnValue("decrypted"),
    };
    const auditEvents: AuditEventRepository = {
      create: jest.fn(),
    };
    const unitOfWork: UnitOfWorkPort = {
      runInTransaction: jest.fn(async (work) => work({ _brand: "TransactionContext" })),
    };

    const useCase = new CompleteLoginUseCase(
      oidcClient,
      requests,
      userAccounts,
      officeUsers,
      sessions,
      sessionTokens,
      envelopeEncryption,
      auditEvents,
      unitOfWork,
    );

    return { useCase, sessions };
  }

  it("rejects the login when the ID token carries no auth_time claim", async () => {
    const { useCase, sessions } = buildUseCase({
      subject,
      issuer,
      authTime: null,
      authMethods: ["otp", "pwd"],
    });

    const result = await useCase.execute({ callbackUrl: new URL("http://localhost/callback?state=x") });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("AUTHENTICATION_TIME_UNVERIFIED");
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it("succeeds with a null mfaContext when amr has no accepted method — Keycloak's OTP form doesn't populate amr today, so this cannot be a login-blocking gate yet (see the ACCEPTED_MFA_METHODS comment)", async () => {
    const { useCase, sessions } = buildUseCase({
      subject,
      issuer,
      authTime: new Date(),
      authMethods: ["pwd"],
    });

    const result = await useCase.execute({ callbackUrl: new URL("http://localhost/callback?state=x") });

    expect(result.ok).toBe(true);
    const createdSession = sessions.create.mock.calls[0][0];
    expect(createdSession.mfaContext).toBeNull();
  });

  it("succeeds with a null mfaContext when amr is entirely absent", async () => {
    const { useCase, sessions } = buildUseCase({
      subject,
      issuer,
      authTime: new Date(),
      authMethods: null,
    });

    const result = await useCase.execute({ callbackUrl: new URL("http://localhost/callback?state=x") });

    expect(result.ok).toBe(true);
    const createdSession = sessions.create.mock.calls[0][0];
    expect(createdSession.mfaContext).toBeNull();
  });

  it("succeeds and records the real auth_time when amr includes otp", async () => {
    const authTime = new Date("2026-01-01T10:00:00Z");
    const { useCase, sessions } = buildUseCase({
      subject,
      issuer,
      authTime,
      authMethods: ["pwd", "otp"],
    });

    const result = await useCase.execute({ callbackUrl: new URL("http://localhost/callback?state=x") });

    expect(result.ok).toBe(true);
    expect(sessions.create).toHaveBeenCalledTimes(1);
    const createdSession = sessions.create.mock.calls[0][0];
    expect(createdSession.authenticatedAt).toEqual(authTime);
    expect(createdSession.mfaContext).toBe("otp");
  });
});
