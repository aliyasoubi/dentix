import { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import request from "supertest";
import type { App } from "supertest/types";
import type { Repository } from "typeorm";
import { asUuid, Uuid } from "@dentix/kernel";
import { AppModule } from "../src/app.module";
import { Office } from "../src/modules/office-administration/domain/entities/office.entity";
import { OFFICE_REPOSITORY } from "../src/modules/office-administration/domain/repositories/office.repository";
import type { OfficeRepository } from "../src/modules/office-administration/domain/repositories/office.repository";
import { UserAccount } from "../src/modules/identity-access/domain/entities/user-account.entity";
import { UserSession } from "../src/modules/identity-access/domain/entities/user-session.entity";
import { USER_ACCOUNT_REPOSITORY } from "../src/modules/identity-access/domain/repositories/user-account.repository";
import type { UserAccountRepository } from "../src/modules/identity-access/domain/repositories/user-account.repository";
import { USER_SESSION_REPOSITORY } from "../src/modules/identity-access/domain/repositories/user-session.repository";
import type { UserSessionRepository } from "../src/modules/identity-access/domain/repositories/user-session.repository";
import { KEYCLOAK_ADMIN_PORT } from "../src/modules/identity-access/application/ports/keycloak-admin.port";
import type {
  KeycloakAdminPort,
  KeycloakAdminUser,
} from "../src/modules/identity-access/application/ports/keycloak-admin.port";
import { SessionTokenService } from "../src/modules/identity-access/infrastructure/crypto/session-token.service";
import { OfficeUserOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../src/modules/identity-access/presentation/http/cookies";

interface ErrorResponseBody {
  readonly code?: string;
}

interface AddOfficeUserResponseBody {
  readonly officeUserId: string;
}

/**
 * API-contract layer for the admin add-user flow. Same approach as
 * patients.api-spec.ts: seed state through the real repositories, then
 * assert on HTTP mechanics — the authorization matrix, the recent-
 * authentication gate, CSRF, and the stable error codes — rather than
 * re-proving domain rules the use-case unit tests already cover.
 *
 * KeycloakAdminPort is stubbed: what's under test is Dentix's contract, and
 * binding this suite to a live Keycloak would make it an integration test of
 * someone else's server. The adapter has its own unit tests.
 */
describe("Office users (API contract)", () => {
  let app: INestApplication<App>;
  let offices: OfficeRepository;
  let userAccounts: UserAccountRepository;
  let sessions: UserSessionRepository;
  let sessionTokens: SessionTokenService;
  let officeUserOrmRepo: Repository<OfficeUserOrmEntity>;

  /** Reassigned per test to steer the stubbed provider lookup. */
  let providerUser: KeycloakAdminUser | null;
  let lookupCalls: string[];

  beforeAll(async () => {
    const keycloakAdminStub: KeycloakAdminPort = {
      findUserByEmail: (email: string): Promise<KeycloakAdminUser | null> => {
        lookupCalls.push(email);
        return Promise.resolve(providerUser);
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KEYCLOAK_ADMIN_PORT)
      .useValue(keycloakAdminStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    await app.init();

    offices = moduleFixture.get(OFFICE_REPOSITORY);
    userAccounts = moduleFixture.get(USER_ACCOUNT_REPOSITORY);
    sessions = moduleFixture.get(USER_SESSION_REPOSITORY);
    sessionTokens = moduleFixture.get(SessionTokenService);
    officeUserOrmRepo = moduleFixture.get(getRepositoryToken(OfficeUserOrmEntity));
  });

  beforeEach(() => {
    providerUser = { subject: `kc-${randomUUID()}`, email: "new.person@example.com", enabled: true };
    lookupCalls = [];
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedSession(
    options: { isOfficeAdmin?: boolean; authenticatedAt?: Date } = {},
  ): Promise<{ sessionToken: string; csrfToken: string; officeId: Uuid; userId: Uuid }> {
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
      displayName: "API Test Admin",
    });
    await userAccounts.create(account);

    await officeUserOrmRepo.insert({
      id: randomUUID(),
      officeId: office.id,
      userId: account.id,
      permissionVersion: 1,
      isActive: true,
      isOfficeAdmin: options.isOfficeAdmin ?? true,
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
      // Defaults to "just now" so only the recent-auth tests deal with it.
      authenticatedAt: options.authenticatedAt ?? now,
      mfaContext: "otp",
      csrfTokenHash: sessionTokens.hash(csrfToken),
      permissionVersion: 1,
      now,
    });
    await sessions.create(session);

    return { sessionToken, csrfToken, officeId: office.id, userId: account.id };
  }

  function post(
    credentials: { sessionToken: string; csrfToken: string },
    body: Record<string, unknown>,
  ): request.Test {
    return request(app.getHttpServer())
      .post("/api/v1/office-users")
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
      )
      .set("X-CSRF-Token", credentials.csrfToken)
      .send(body);
  }

  describe("authorization", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/office-users")
        .send({ email: "new.person@example.com" });

      expect(response.status).toBe(401);
    });

    it("returns 403 when the session is valid but no CSRF header is sent", async () => {
      const { sessionToken } = await seedSession();

      const response = await request(app.getHttpServer())
        .post("/api/v1/office-users")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ email: "new.person@example.com" });

      expect(response.status).toBe(403);
    });

    it("returns 403 FORBIDDEN for an authenticated non-admin, without querying the provider", async () => {
      const credentials = await seedSession({ isOfficeAdmin: false });

      const response = await post(credentials, { email: "new.person@example.com" });

      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("FORBIDDEN");
      expect(lookupCalls).toEqual([]);
    });
  });

  // 09-authentication-session-architecture.md, "Recent authentication":
  // permission administration is on the list that requires authenticatedAt
  // inside the window.
  describe("recent-authentication gate", () => {
    const SIX_MINUTES_AGO = (): Date => new Date(Date.now() - 6 * 60 * 1000);

    it("returns 403 RECENT_AUTHENTICATION_REQUIRED for an admin whose session is stale", async () => {
      const credentials = await seedSession({ authenticatedAt: SIX_MINUTES_AGO() });

      const response = await post(credentials, { email: "new.person@example.com" });

      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("RECENT_AUTHENTICATION_REQUIRED");
      expect(lookupCalls).toEqual([]);
    });

    // 401 would be swallowed by the SPA's generic session-expired handling
    // and retried as an ordinary login, which the provider can answer from
    // its existing SSO session with the same stale auth_time — a loop.
    it("uses 403 rather than 401, since the session itself is still valid", async () => {
      const credentials = await seedSession({ authenticatedAt: SIX_MINUTES_AGO() });

      const response = await post(credentials, { email: "new.person@example.com" });

      expect(response.status).not.toBe(401);
    });

    it("lets a freshly authenticated admin through", async () => {
      const credentials = await seedSession();

      const response = await post(credentials, { email: "new.person@example.com" });

      expect(response.status).toBe(201);
    });
  });

  describe("request validation and provider outcomes", () => {
    it("returns 400 for a body that isn't a valid email", async () => {
      const credentials = await seedSession();

      const response = await post(credentials, { email: "not-an-email" });

      expect(response.status).toBe(400);
      expect(lookupCalls).toEqual([]);
    });

    it("returns 400 NOT_FOUND_IN_PROVIDER when no provider account has that email", async () => {
      const credentials = await seedSession();
      providerUser = null;

      const response = await post(credentials, { email: "nobody@example.com" });

      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("NOT_FOUND_IN_PROVIDER");
    });

    it("returns 400 PROVIDER_ACCOUNT_DISABLED for a disabled provider account", async () => {
      const credentials = await seedSession();
      providerUser = { subject: `kc-${randomUUID()}`, email: "disabled@example.com", enabled: false };

      const response = await post(credentials, { email: "disabled@example.com" });

      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("PROVIDER_ACCOUNT_DISABLED");
    });

    it("returns 400 ALREADY_LINKED when that identity is already an office user", async () => {
      const credentials = await seedSession();

      const first = await post(credentials, { email: "new.person@example.com" });
      expect(first.status).toBe(201);

      const second = await post(credentials, { email: "new.person@example.com" });

      expect(second.status).toBe(400);
      expect((second.body as ErrorResponseBody).code).toBe("ALREADY_LINKED");
    });
  });

  describe("success", () => {
    it("returns 201 and links the identity as a non-admin member of the caller's office", async () => {
      const credentials = await seedSession();

      const response = await post(credentials, { email: "new.person@example.com" });

      expect(response.status).toBe(201);
      const created = await officeUserOrmRepo.findOneByOrFail({
        id: (response.body as AddOfficeUserResponseBody).officeUserId,
      });
      // office_id comes from the session, never the request body.
      expect(created.officeId).toBe(credentials.officeId);
      expect(created.createdBy).toBe(credentials.userId);
      // Admin rights are not grantable through this endpoint.
      expect(created.isOfficeAdmin).toBe(false);
      expect(created.isActive).toBe(true);
    });

    // Stronger than silently dropping them: forbidNonWhitelisted rejects the
    // request outright, so an attempt to self-grant admin or write into
    // another office fails loudly instead of appearing to succeed.
    it("rejects a request that tries to smuggle in officeId or isOfficeAdmin", async () => {
      const credentials = await seedSession();

      const response = await post(credentials, {
        email: "new.person@example.com",
        officeId: randomUUID(),
        isOfficeAdmin: true,
      });

      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      expect(await officeUserOrmRepo.countBy({ officeId: credentials.officeId })).toBe(1);
    });
  });
});
