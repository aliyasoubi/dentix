import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import request from "supertest";
import type { App } from "supertest/types";
import type { Repository } from "typeorm";
import { asUuid } from "@dentix/kernel";
import { AppModule } from "../src/app.module";
import { Office } from "../src/modules/office-administration/domain/entities/office.entity";
import { OFFICE_REPOSITORY } from "../src/modules/office-administration/domain/repositories/office.repository";
import type { OfficeRepository } from "../src/modules/office-administration/domain/repositories/office.repository";
import { UserAccount } from "../src/modules/identity-access/domain/entities/user-account.entity";
import { UserSession } from "../src/modules/identity-access/domain/entities/user-session.entity";
import { OidcAuthorizationRequest } from "../src/modules/identity-access/domain/entities/oidc-authorization-request.entity";
import { OIDC_AUTHORIZATION_REQUEST_REPOSITORY } from "../src/modules/identity-access/domain/repositories/oidc-authorization-request.repository";
import type { OidcAuthorizationRequestRepository } from "../src/modules/identity-access/domain/repositories/oidc-authorization-request.repository";
import { USER_ACCOUNT_REPOSITORY } from "../src/modules/identity-access/domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../src/modules/identity-access/domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "../src/modules/identity-access/domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../src/modules/identity-access/domain/repositories/user-session.repository";
import { SessionTokenService } from "../src/modules/identity-access/infrastructure/crypto/session-token.service";
import { EnvelopeEncryptionService } from "../src/modules/identity-access/infrastructure/crypto/envelope-encryption.service";
import { OfficeUserOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../src/modules/identity-access/presentation/http/cookies";

interface WhoamiResponseBody {
  readonly displayName: string;
  readonly permissionVersion: number;
  readonly isRecentlyAuthenticated: boolean;
}

interface ErrorResponseBody {
  readonly code: string;
}

interface LogoutResponseBody {
  readonly providerEndSessionUrl: string;
}

// API-contract layer for S3 (09-authentication-session-architecture.md).
// Requires Keycloak reachable (OIDC discovery on app bootstrap) and
// Postgres migrated — the S3 slice's own Verify line names both. What a
// real Authorization Code exchange with live MFA actually does is the
// human-check walkthrough's job, not this file's: everything here either
// exercises a failure path or seeds state directly and asserts on the
// mechanics (cookies, CSRF, session validity) around it.
describe("Auth (API contract)", () => {
  let app: INestApplication<App>;
  let offices: OfficeRepository;
  let userAccounts: UserAccountRepository;
  let sessions: UserSessionRepository;
  let oidcRequests: OidcAuthorizationRequestRepository;
  let sessionTokens: SessionTokenService;
  let envelopeEncryption: EnvelopeEncryptionService;
  let officeUserOrmRepo: Repository<OfficeUserOrmEntity>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    await app.init();

    offices = moduleFixture.get(OFFICE_REPOSITORY);
    userAccounts = moduleFixture.get(USER_ACCOUNT_REPOSITORY);
    sessions = moduleFixture.get(USER_SESSION_REPOSITORY);
    oidcRequests = moduleFixture.get(OIDC_AUTHORIZATION_REQUEST_REPOSITORY);
    sessionTokens = moduleFixture.get(SessionTokenService);
    envelopeEncryption = moduleFixture.get(EnvelopeEncryptionService);
    officeUserOrmRepo = moduleFixture.get(getRepositoryToken(OfficeUserOrmEntity));
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedActiveSession(
    officeUserOverrides: Partial<{ isActive: boolean }> = {},
  ): Promise<{ sessionToken: string; csrfToken: string }> {
    const office = Office.create({
      id: asUuid(randomUUID()),
      code: `t-${randomUUID().slice(0, 8)}`,
      timezone: "Asia/Tehran",
    });
    await offices.create(office);
    const account = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: `sub-${randomUUID()}`,
      issuer: "https://kc.local",
      displayName: "API Test User",
    });
    await userAccounts.create(account);

    // Seeded directly rather than through officeUserRepo.create(), same as
    // the integration suite — this helper needs full control over isActive
    // or the "revoked membership" case below can't be constructed at all.
    // A session without this row is exactly the bug the membership-
    // revalidation fix closes: whoami must not succeed for a user who no
    // longer has (or never had) office access.
    await officeUserOrmRepo.insert({
      id: randomUUID(),
      officeId: office.id,
      userId: account.id,
      permissionVersion: 1,
      isActive: officeUserOverrides.isActive ?? true,
      createdAt: new Date(),
      createdBy: null,
      updatedAt: new Date(),
      updatedBy: null,
      archivedAt: null,
      archivedBy: null,
    });

    const sessionToken = sessionTokens.generateOpaqueToken();
    const csrfToken = sessionTokens.generateOpaqueToken();
    const now = new Date();
    const session = UserSession.create({
      id: asUuid(randomUUID()),
      sessionHash: sessionTokens.hash(sessionToken),
      userId: account.id,
      officeId: office.id,
      authenticatedAt: now,
      mfaContext: "otp",
      csrfTokenHash: sessionTokens.hash(csrfToken),
      permissionVersion: 1,
      now,
    });
    await sessions.create(session);

    return { sessionToken, csrfToken };
  }

  describe("GET /auth/login", () => {
    it("redirects to the provider with PKCE, state, and nonce set", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/auth/login?returnTo=/dashboard");

      expect(response.status).toBe(302);
      const location = new URL(response.headers.location as string);
      expect(location.searchParams.get("response_type")).toBe("code");
      expect(location.searchParams.get("client_id")).toBe("dentix-bff");
      expect(location.searchParams.get("code_challenge_method")).toBe("S256");
      expect(location.searchParams.get("state")).toBeTruthy();
      expect(location.searchParams.get("nonce")).toBeTruthy();
      expect(location.searchParams.get("code_challenge")).toBeTruthy();
    });

    it("rejects an open-redirect returnTo instead of forwarding it to the provider", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/auth/login?returnTo=//evil.example.com",
      );
      // A malformed client-supplied returnTo is the caller's mistake, not
      // ours — StartLoginUseCase catches OidcAuthorizationRequest.create's
      // synchronous throw and turns it into a 400, not a redirect anywhere
      // (let alone to the attacker-controlled host) and not an uncaught
      // exception surfacing as a 500.
      expect(response.status).toBe(400);
      expect((response.body as { code: string }).code).toBe("INVALID_RETURN_PATH");
    });
  });

  describe("GET /auth/callback failure paths", () => {
    it("redirects to an error page when state is missing", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/auth/callback");
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("error=INVALID_STATE");
    });

    it("redirects to an error page when state matches no authorization request", async () => {
      const response = await request(app.getHttpServer()).get(
        "/api/v1/auth/callback?state=some-random-unknown-state&code=irrelevant",
      );
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("error=INVALID_STATE");
    });

    it("redirects to an error page when the authorization request was already used", async () => {
      const state = sessionTokens.generateOpaqueToken();
      const now = new Date();
      const req = OidcAuthorizationRequest.create({
        id: asUuid(randomUUID()),
        stateHash: sessionTokens.hash(state),
        nonceEncrypted: envelopeEncryption.encrypt("nonce"),
        pkceVerifierEncrypted: envelopeEncryption.encrypt("verifier"),
        returnPath: "/dashboard",
        now,
      });
      req.markUsed(now);
      await oidcRequests.create(req);
      await oidcRequests.markUsed(req);

      const response = await request(app.getHttpServer()).get(
        `/api/v1/auth/callback?state=${state}&code=irrelevant`,
      );
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain("error=REQUEST_EXPIRED_OR_USED");
    });
  });

  describe("GET /auth/whoami", () => {
    it("returns 401 NO_SESSION with no cookie", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/auth/whoami");
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: "NO_SESSION" });
    });

    it("returns the session's identity when the cookie is valid", async () => {
      const { sessionToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .get("/api/v1/auth/whoami")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      const body = response.body as WhoamiResponseBody;
      expect(body.displayName).toBe("API Test User");
      expect(body.permissionVersion).toBe(1);
      expect(body.isRecentlyAuthenticated).toBe(true);
    });

    it("returns 401 for a revoked session", async () => {
      const { sessionToken } = await seedActiveSession();
      // Revoke it exactly the way logout does, then confirm whoami honors it.
      const hash = sessionTokens.hash(sessionToken);
      const session = await sessions.findByHash(hash);
      session!.revoke("test", new Date());
      await sessions.revoke(session!);

      const response = await request(app.getHttpServer())
        .get("/api/v1/auth/whoami")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: "REVOKED" });
    });

    it("returns 401 NO_OFFICE_MEMBERSHIP once the office membership behind an otherwise-valid session is deactivated", async () => {
      // Proof for the bug the external review flagged: a session token
      // only proves "this login was valid once" — it must not keep working
      // after an admin deactivates the membership it was issued for.
      const { sessionToken } = await seedActiveSession({ isActive: false });

      const response = await request(app.getHttpServer())
        .get("/api/v1/auth/whoami")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ code: "NO_OFFICE_MEMBERSHIP" });

      // The revalidation failure also revokes the session server-side, so
      // it can't be retried even if the membership is later reactivated.
      const again = await request(app.getHttpServer())
        .get("/api/v1/auth/whoami")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
      expect(again.status).toBe(401);
      expect(again.body).toEqual({ code: "REVOKED" });
    });
  });

  describe("POST /auth/logout", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer()).post("/api/v1/auth/logout");
      expect(response.status).toBe(401);
      // Same {code} envelope as whoami — a guard-thrown exception must not
      // disagree with a handler-constructed one (AuthErrorFilter).
      expect((response.body as ErrorResponseBody).code).toBe("NO_SESSION");
    });

    it("returns 403 CSRF_TOKEN_MISSING when the session is valid but no CSRF header is sent", async () => {
      const { sessionToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("CSRF_TOKEN_MISSING");
    });

    it("returns 403 CSRF_TOKEN_INVALID when the header doesn't match the session's token", async () => {
      const { sessionToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .set("X-CSRF-Token", "wrong-token");
      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("CSRF_TOKEN_INVALID");
    });

    it("returns 403 CROSS_ORIGIN_REQUEST_REJECTED when Sec-Fetch-Site indicates a cross-site request", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .set("X-CSRF-Token", csrfToken)
        .set("Sec-Fetch-Site", "cross-site");
      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("CROSS_ORIGIN_REQUEST_REJECTED");
    });

    it("revokes the session and returns a provider end-session URL when CSRF matches", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();

      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken);

      expect(response.status).toBe(200);
      expect((response.body as LogoutResponseBody).providerEndSessionUrl).toContain(
        "/realms/dentix/protocol/openid-connect/logout",
      );

      const whoamiAfter = await request(app.getHttpServer())
        .get("/api/v1/auth/whoami")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
      expect(whoamiAfter.status).toBe(401);
      expect(whoamiAfter.body).toEqual({ code: "REVOKED" });
    });
  });
});
