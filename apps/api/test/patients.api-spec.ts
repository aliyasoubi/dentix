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
import { SessionTokenService } from "../src/modules/identity-access/infrastructure/crypto/session-token.service";
import { OfficeUserOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/office-user.orm-entity";
import {
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from "../src/modules/identity-access/presentation/http/cookies";

interface ErrorResponseBody {
  readonly code?: string;
  readonly message?: string;
}

interface CreatePatientResponseBody {
  readonly id: string;
  readonly patientNumber: number;
}

interface PatientSearchResultBody {
  readonly id: string;
  readonly patientNumber: number;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
  readonly dateOfBirth: string | null;
}

// API-contract layer for S4 (02-slices-release-0.5.md). Same approach as
// auth.api-spec.ts: seed state directly against the real repositories,
// then assert on the HTTP mechanics (auth, CSRF, validation, response
// shape) rather than re-proving domain rules already covered by unit and
// integration tests.
describe("Patients (API contract)", () => {
  let app: INestApplication<App>;
  let offices: OfficeRepository;
  let userAccounts: UserAccountRepository;
  let sessions: UserSessionRepository;
  let sessionTokens: SessionTokenService;
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
    sessionTokens = moduleFixture.get(SessionTokenService);
    officeUserOrmRepo = moduleFixture.get(getRepositoryToken(OfficeUserOrmEntity));
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedActiveSession(): Promise<{
    sessionToken: string;
    csrfToken: string;
    officeId: Uuid;
    userId: Uuid;
  }> {
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

    await officeUserOrmRepo.insert({
      id: randomUUID(),
      officeId: office.id,
      userId: account.id,
      permissionVersion: 1,
      isActive: true,
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

    return { sessionToken, csrfToken, officeId: office.id, userId: account.id };
  }

  describe("POST /patients", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .send({ nativeName: "رضا احمدی", phone: "09123456789" });
      expect(response.status).toBe(401);
    });

    it("returns 403 when the session is valid but no CSRF header is sent", async () => {
      const { sessionToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({ nativeName: "رضا احمدی", phone: "09123456789" });
      expect(response.status).toBe(403);
    });

    it("returns 400 NATIVE_NAME_REQUIRED when the native name is blank", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "   ", phone: "09123456789" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("NATIVE_NAME_REQUIRED");
    });

    it("returns 400 INVALID_PHONE for an unrecognizable phone number", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", phone: "02112345678" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_PHONE");
    });

    it("returns 400 CONTACT_REQUIRED when no phone is given and contactUnavailable isn't set", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("CONTACT_REQUIRED");
    });

    it("creates a patient with native + Latin name and a phone, returning its id and patient number", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", latinName: "Reza Ahmadi", phone: "09123456789" });

      expect(response.status).toBe(201);
      const body = response.body as CreatePatientResponseBody;
      expect(body.id).toBeTruthy();
      expect(body.patientNumber).toBeGreaterThan(0);
    });

    it("accepts contactUnavailable in place of a phone", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true });
      expect(response.status).toBe(201);
    });

    it("returns 400 INVALID_DATE_OF_BIRTH for a calendrically impossible date", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, dateOfBirth: "2025-02-30" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_DATE_OF_BIRTH");
    });

    it("returns 400 INVALID_DATE_OF_BIRTH for a date in the future", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, dateOfBirth: "2099-01-01" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_DATE_OF_BIRTH");
    });

    it("accepts a well-known date of birth and returns it unchanged from search", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        // 2024-03-20 = Nowruz (Farvardin 1, 1403) — the exact ADR-008 boundary
        // date; also exercises the raw-SQL date_of_birth::text cast, which
        // must survive round-trip regardless of the server process's own
        // timezone (see the cast's comment in patient.typeorm-repository.ts).
        .send({ nativeName: "سارا نوروزی", contactUnavailable: true, dateOfBirth: "2024-03-20" });
      expect(create.status).toBe(201);
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await request(app.getHttpServer())
        .get("/api/v1/patients?query=" + encodeURIComponent("سارا نوروزی"))
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      const found = results.find((r) => r.id === createdId);
      expect(found?.dateOfBirth).toBe("2024-03-20");
    });

    it("dateOfBirth is null in search results when not provided", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "بدون تاریخ تولد", contactUnavailable: true });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await request(app.getHttpServer())
        .get("/api/v1/patients?query=" + encodeURIComponent("بدون تاریخ تولد"))
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);

      const results = response.body as PatientSearchResultBody[];
      expect(results.find((r) => r.id === createdId)?.dateOfBirth).toBeNull();
    });
  });

  describe("GET /patients", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/patients");
      expect(response.status).toBe(401);
    });

    it("finds a just-created patient by a Persian-digit form of its phone number", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "زهرا کریمی", phone: "09121112233" });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await request(app.getHttpServer())
        .get("/api/v1/patients?query=" + encodeURIComponent("۰۹۱۲۱۱۱۲۲۳۳"))
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).toContain(createdId);
    });

    it("finds a just-created patient by a partial Arabic-Yeh spelling of its native name", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "علی رضایی", contactUnavailable: true });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await request(app.getHttpServer())
        .get("/api/v1/patients?query=" + encodeURIComponent("علي")) // Arabic Yeh
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).toContain(createdId);
    });

    it("does not leak another office's patient into a search result", async () => {
      const officeA = await seedActiveSession();
      const officeB = await seedActiveSession();
      await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${officeA.sessionToken}; ${CSRF_COOKIE_NAME}=${officeA.csrfToken}`,
        )
        .set("X-CSRF-Token", officeA.csrfToken)
        .send({ nativeName: "بیمار محرمانه", contactUnavailable: true });

      const response = await request(app.getHttpServer())
        .get("/api/v1/patients?query=" + encodeURIComponent("محرمانه"))
        .set("Cookie", `${SESSION_COOKIE_NAME}=${officeB.sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body as PatientSearchResultBody[]).toHaveLength(0);
    });
  });
});
