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
import { PatientAddressOrmEntity } from "../src/modules/patients/infrastructure/persistence/patient-address.orm-entity";
import { RoleOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/role.orm-entity";
import { UserRoleOrmEntity } from "../src/modules/identity-access/infrastructure/persistence/user-role.orm-entity";
import { SeedDefaultRolesUseCase } from "../src/modules/identity-access/public-api";
import { AuditEventOrmEntity } from "../src/modules/audit/infrastructure/persistence/audit-event.orm-entity";

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

interface PatientDetailResponseBody {
  readonly id: string;
  readonly patientNumber: number;
  readonly status: string;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
  readonly contactUnavailable: boolean;
  readonly email: string | null;
  readonly dateOfBirth: string | null;
  readonly sex: string;
  readonly nationality: string;
  readonly identifierNumber: string | null;
  readonly province: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly postalCode: string | null;
  readonly deliveryNotes: string | null;
  readonly occupation: string | null;
  readonly referralSource: string | null;
  readonly preferredLanguage: string;
  readonly version: number;
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
  let patientAddressOrmRepo: Repository<PatientAddressOrmEntity>;
  let roleOrmRepo: Repository<RoleOrmEntity>;
  let userRoleOrmRepo: Repository<UserRoleOrmEntity>;
  let auditEventOrmRepo: Repository<AuditEventOrmEntity>;
  let seedDefaultRoles: SeedDefaultRolesUseCase;

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
    patientAddressOrmRepo = moduleFixture.get(getRepositoryToken(PatientAddressOrmEntity));
    roleOrmRepo = moduleFixture.get(getRepositoryToken(RoleOrmEntity));
    userRoleOrmRepo = moduleFixture.get(getRepositoryToken(UserRoleOrmEntity));
    auditEventOrmRepo = moduleFixture.get(getRepositoryToken(AuditEventOrmEntity));
    seedDefaultRoles = moduleFixture.get(SeedDefaultRolesUseCase);
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * `roleCode` defaults to office_manager (patient.view + patient.create).
   * Pass a different code — or null for no role at all — to exercise the
   * authorization boundary. This used to grant nothing and every test still
   * expected 201/200, which is exactly how the missing PermissionGuard on
   * PatientsController went unnoticed: the suite encoded the bypass as
   * expected behavior.
   */
  async function seedActiveSession(roleCode: string | null = "office_manager"): Promise<{
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

    const officeUserId = randomUUID();
    await officeUserOrmRepo.insert({
      id: officeUserId,
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

    if (roleCode) {
      await seedDefaultRoles.execute({ officeId: office.id });
      const role = await roleOrmRepo.findOneByOrFail({ officeId: office.id, code: roleCode });
      await userRoleOrmRepo.insert({
        id: randomUUID(),
        officeUserId,
        roleId: role.id,
        createdAt: new Date(),
        createdBy: null,
      });
    }

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

  /**
   * The endpoint under test is POST — see patients.controller.ts's own
   * comment for why search takes its term in a body rather than a query
   * string. This helper exists so every call site gets the CSRF header for
   * free, matching how the browser client always sends it.
   */
  function search(
    credentials: { sessionToken: string; csrfToken: string },
    body: { query?: string; limit?: number } = {},
  ): request.Test {
    return request(app.getHttpServer())
      .post("/api/v1/patients/search")
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
      )
      .set("X-CSRF-Token", credentials.csrfToken)
      .send(body);
  }

  async function createPatient(
    credentials: { sessionToken: string; csrfToken: string },
    body: Record<string, unknown>,
  ): Promise<CreatePatientResponseBody> {
    const response = await request(app.getHttpServer())
      .post("/api/v1/patients")
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
      )
      .set("X-CSRF-Token", credentials.csrfToken)
      .send(body);
    return response.body as CreatePatientResponseBody;
  }

  function getById(credentials: { sessionToken: string; csrfToken: string }, id: string): request.Test {
    return request(app.getHttpServer())
      .get(`/api/v1/patients/${id}`)
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
      );
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

    // Authentication is not authorization. These are the checks whose
    // absence let an authenticated-but-roleless member create patients.
    describe("authorization", () => {
      it("returns 403 MISSING_PERMISSION for an active member holding no role at all", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession(null);
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true });
        expect(response.status).toBe(403);
        expect((response.body as ErrorResponseBody).code).toBe("MISSING_PERMISSION");
      });

      // cashier carries patient.view but deliberately not patient.create
      // (01-product/04-roles-and-permissions.md) — proves the guard checks
      // the specific code, not merely "has some role".
      it("returns 403 for a cashier creating a patient, while still allowing them to search", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession("cashier");

        const create = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true });
        expect(create.status).toBe(403);
        expect((create.body as ErrorResponseBody).code).toBe("MISSING_PERMISSION");

        const searchResponse = await search({ sessionToken, csrfToken });
        expect(searchResponse.status).toBe(200);
      });

      it("returns 403 MISSING_PERMISSION when a roleless member searches patients", async () => {
        const credentials = await seedActiveSession(null);
        const response = await search(credentials);
        expect(response.status).toBe(403);
        expect((response.body as ErrorResponseBody).code).toBe("MISSING_PERMISSION");
      });
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

    it("returns 400 INVALID_EMAIL for an unrecognizable email address", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, email: "not-an-email" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_EMAIL");
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

    // The office's transition off its prior paper/legacy system — a
    // receptionist entering an already-known patient types their existing
    // number instead of getting a new one auto-assigned.
    it("uses an explicit patientNumber instead of auto-assigning one", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, patientNumber: 2501 });

      expect(response.status).toBe(201);
      expect((response.body as CreatePatientResponseBody).patientNumber).toBe(2501);
    });

    it("returns 409 PATIENT_NUMBER_TAKEN when the explicit patientNumber is already in use in this office", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const first = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, patientNumber: 2502 });
      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "زهرا کریمی", contactUnavailable: true, patientNumber: 2502 });
      expect(second.status).toBe(409);
      expect((second.body as ErrorResponseBody).code).toBe("PATIENT_NUMBER_TAKEN");
    });

    it("rejects a non-positive patientNumber with 400 VALIDATION_FAILED", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, patientNumber: 0 });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
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

    it("accepts email, occupation, and referralSource, all visible on the detail page afterward", async () => {
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({
          nativeName: "زهرا کریمی",
          contactUnavailable: true,
          email: "Zahra.Karimi@Example.com",
          occupation: "دندانپزشک",
          referralSource: "اینستاگرام",
        });
      expect(create.status).toBe(201);
      const created = create.body as CreatePatientResponseBody;

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/patients/${created.id}`)
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        );
      expect(detail.status).toBe(200);
      const body = detail.body as PatientDetailResponseBody;
      expect(body.email).toBe("Zahra.Karimi@Example.com");
      expect(body.occupation).toBe("دندانپزشک");
      expect(body.referralSource).toBe("اینستاگرام");
      expect(body.preferredLanguage).toBe("fa-IR");
    });

    it("accepts a well-formed national code, optional and checksum-validated", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, identifierNumber: "1234567891" });
      expect(response.status).toBe(201);
    });

    it("returns 400 INVALID_NATIONAL_CODE for a national code with a bad check digit", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, identifierNumber: "1234567890" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_NATIONAL_CODE");
    });

    // International-patient support: nationality "foreign" switches
    // identifierNumber from national-code checksum validation to a loose
    // passport-number format check.
    it("accepts a well-formed passport number for a foreign patient", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({
          nativeName: "جان اسمیت",
          contactUnavailable: true,
          nationality: "foreign",
          identifierNumber: "AB1234567",
        });
      expect(response.status).toBe(201);
    });

    it("returns 400 INVALID_PASSPORT_NUMBER for a foreign patient's too-short identifier", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({
          nativeName: "جان اسمیت",
          contactUnavailable: true,
          nationality: "foreign",
          identifierNumber: "AB",
        });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_PASSPORT_NUMBER");
    });

    // The same value is checksum-valid as a national code but must not be
    // silently accepted as one once nationality says "foreign" — proves the
    // switch is real, not cosmetic.
    it("validates identifierNumber as a passport, not a national code, once nationality is foreign", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        // A bad Iranian check digit — INVALID_NATIONAL_CODE for an iranian
        // patient (proven above) — but a perfectly fine 10-character
        // alphanumeric-looking passport number.
        .send({
          nativeName: "جان اسمیت",
          contactUnavailable: true,
          nationality: "foreign",
          identifierNumber: "1234567890",
        });
      expect(response.status).toBe(201);
    });

    it("defaults nationality to iranian when omitted", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      // A well-formed passport number that is NOT checksum-valid as a
      // national code — must be rejected under the default nationality.
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, identifierNumber: "AB1234567" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_NATIONAL_CODE");
    });

    it("rejects an unknown nationality value", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true, nationality: "martian" });
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
    });

    // A missing national code must never block registration — it's the one
    // optional field 01-patient-management.md is explicit about.
    it("does not require a national code to create a patient", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true });
      expect(response.status).toBe(201);
    });

    it("persists a structured address when at least one field is provided", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({
          nativeName: "رضا احمدی",
          contactUnavailable: true,
          province: "تهران",
          city: "تهران",
          district: "ونک",
          addressLine1: "خیابان ولیعصر",
          postalCode: "1234567890",
        });
      expect(response.status).toBe(201);
      const createdId = (response.body as CreatePatientResponseBody).id;

      const address = await patientAddressOrmRepo.findOneBy({ patientId: createdId });
      expect(address?.province).toBe("تهران");
      expect(address?.district).toBe("ونک");
      expect(address?.postalCode).toBe("1234567890");
      expect(address?.addressLine2).toBeNull();
    });

    // No address field at all must never create an empty row — the point of
    // PatientAddress.isEmpty gating the use case's write.
    it("creates no address row when no address field is provided", async () => {
      const { sessionToken, csrfToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
        .set("X-CSRF-Token", csrfToken)
        .send({ nativeName: "رضا احمدی", contactUnavailable: true });
      const createdId = (response.body as CreatePatientResponseBody).id;

      expect(await patientAddressOrmRepo.findOneBy({ patientId: createdId })).toBeNull();
    });

    // Regression tests for a real gap: there was no request validation at
    // all, so each of these previously reached the use case — the first two
    // crashed with a 500 (`.trim()` / DB check constraint), and the third
    // silently passed the CONTACT_REQUIRED guard because a non-empty string
    // is truthy, creating a patient with no contact method at all.
    describe("request validation (type-level)", () => {
      it("rejects a non-string phone with 400 VALIDATION_FAILED instead of crashing", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", phone: 123 });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects an unknown sex value rather than deferring to the database check constraint", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true, sex: "banana" });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects a truthy-string contactUnavailable instead of letting it bypass CONTACT_REQUIRED", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: "no" });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects unknown properties rather than silently ignoring them", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true, isAdmin: true });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      // Every column behind these fields is an unbounded varchar — nothing at
      // the database stops an oversized value. These limits are the only
      // push-back, so prove they're wired, not merely declared.
      it("rejects a nativeName over the 200-character ceiling", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "ر".repeat(201), contactUnavailable: true });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects deliveryNotes over the 500-character ceiling", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true, deliveryNotes: "ن".repeat(501) });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects a non-string identifierNumber with 400 VALIDATION_FAILED instead of crashing", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", contactUnavailable: true, identifierNumber: 1234567891 });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      // The point of type-level-only validators: domain rules keep their own
      // stable codes rather than collapsing into VALIDATION_FAILED.
      it("still returns the domain code for a well-typed but invalid phone", async () => {
        const { sessionToken, csrfToken } = await seedActiveSession();
        const response = await request(app.getHttpServer())
          .post("/api/v1/patients")
          .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`)
          .set("X-CSRF-Token", csrfToken)
          .send({ nativeName: "رضا احمدی", phone: "02112345678" });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("INVALID_PHONE");
      });
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
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        // 2024-03-20 = Nowruz (Farvardin 1, 1403) — the exact ADR-008 boundary
        // date; also exercises the raw-SQL date_of_birth::text cast, which
        // must survive round-trip regardless of the server process's own
        // timezone (see the cast's comment in patient.typeorm-repository.ts).
        .send({ nativeName: "سارا نوروزی", contactUnavailable: true, dateOfBirth: "2024-03-20" });
      expect(create.status).toBe(201);
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await search(credentials, { query: "سارا نوروزی" });

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      const found = results.find((r) => r.id === createdId);
      expect(found?.dateOfBirth).toBe("2024-03-20");
    });

    it("dateOfBirth is null in search results when not provided", async () => {
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "بدون تاریخ تولد", contactUnavailable: true });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await search(credentials, { query: "بدون تاریخ تولد" });

      const results = response.body as PatientSearchResultBody[];
      expect(results.find((r) => r.id === createdId)?.dateOfBirth).toBeNull();
    });
  });

  describe("POST /patients/search", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer()).post("/api/v1/patients/search").send({});
      expect(response.status).toBe(401);
    });

    it("returns 403 when the session is valid but no CSRF header is sent", async () => {
      const { sessionToken } = await seedActiveSession();
      const response = await request(app.getHttpServer())
        .post("/api/v1/patients/search")
        .set("Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`)
        .send({});
      expect(response.status).toBe(403);
    });

    // The whole point of this endpoint: the search term travels in the
    // request body, never in the URL a query string would put it in.
    it("never puts the search term in the URL", async () => {
      const credentials = await seedActiveSession();
      const response = await search(credentials, { query: "رضا احمدی" });
      expect(response.request.url).not.toContain("رضا");
      expect(response.request.url).not.toContain(encodeURIComponent("رضا احمدی"));
      expect(response.status).toBe(200);
    });

    it("finds a just-created patient by a Persian-digit form of its phone number", async () => {
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "زهرا کریمی", phone: "09121112233" });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await search(credentials, { query: "۰۹۱۲۱۱۱۲۲۳۳" });

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).toContain(createdId);
    });

    it("finds a just-created patient by a partial Arabic-Yeh spelling of its native name", async () => {
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "علی رضایی", contactUnavailable: true });
      const createdId = (create.body as CreatePatientResponseBody).id;

      const response = await search(credentials, { query: "علي" }); // Arabic Yeh

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).toContain(createdId);
    });

    // The search placeholder promises "name, patient number, or mobile" —
    // this is the half of that promise the SQL didn't implement until now.
    it("finds a just-created patient by its exact patient number", async () => {
      const credentials = await seedActiveSession();
      const create = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "کیان مرادی", contactUnavailable: true });
      const created = create.body as CreatePatientResponseBody;

      const response = await search(credentials, { query: String(created.patientNumber) });

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).toContain(created.id);
    });

    // A phone number is also all-digits — this proves the two matching
    // paths don't collide: an 11-digit query finds by phone, not by
    // patient_number (which never reaches 11 digits — see the use case's
    // own MAX_PATIENT_NUMBER_DIGITS comment), and doesn't 500 from binding
    // an out-of-range value to the integer search parameter.
    it("does not error when a full phone number is also searched as a candidate patient number", async () => {
      const credentials = await seedActiveSession();
      await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "امیر رضایی", phone: "09121112233" });

      const response = await search(credentials, { query: "09121112233" });
      expect(response.status).toBe(200);
    });

    // Regression: a receptionist typing an Iranian mobile always starts
    // "0912…". JS's Number() strips the leading zero, so this partial input
    // used to parse as patient number 912 and briefly show an unrelated
    // real patient mid-keystroke if one happened to exist.
    it("does not match a leading-zero numeric query against a same-value patient number", async () => {
      const credentials = await seedActiveSession();
      const decoy = await request(app.getHttpServer())
        .post("/api/v1/patients")
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken)
        .send({ nativeName: "بیمار غیرمرتبط", contactUnavailable: true });
      const decoyPatientNumber = (decoy.body as CreatePatientResponseBody).patientNumber;

      const response = await search(credentials, { query: `0${decoyPatientNumber}` });

      expect(response.status).toBe(200);
      const results = response.body as PatientSearchResultBody[];
      expect(results.map((r) => r.id)).not.toContain((decoy.body as CreatePatientResponseBody).id);
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

      const response = await search(officeB, { query: "محرمانه" });

      expect(response.status).toBe(200);
      expect(response.body as PatientSearchResultBody[]).toHaveLength(0);
    });

    describe("request validation (type-level)", () => {
      it("rejects a non-string query with 400 VALIDATION_FAILED", async () => {
        const credentials = await seedActiveSession();
        const response = await search(credentials, { query: 123 as unknown as string });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects a query longer than 200 characters", async () => {
        const credentials = await seedActiveSession();
        const response = await search(credentials, { query: "a".repeat(201) });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });

      it("rejects a limit outside 1-100", async () => {
        const credentials = await seedActiveSession();
        const tooLarge = await search(credentials, { limit: 101 });
        expect(tooLarge.status).toBe(400);
        const zero = await search(credentials, { limit: 0 });
        expect(zero.status).toBe(400);
      });

      it("rejects unknown properties rather than silently ignoring them", async () => {
        const credentials = await seedActiveSession();
        const response = await search(credentials, {
          query: "test",
          officeId: randomUUID(),
        } as unknown as { query: string });
        expect(response.status).toBe(400);
        expect((response.body as ErrorResponseBody).code).toBe("VALIDATION_FAILED");
      });
    });
  });

  describe("GET /patients/:id", () => {
    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer()).get(`/api/v1/patients/${randomUUID()}`);
      expect(response.status).toBe(401);
    });

    it("returns the full record, with an ETag echoing the version, for a patient in the caller's office", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, {
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        nationality: "iranian",
        identifierNumber: "1234567891",
        province: "تهران",
      });

      const response = await getById(credentials, created.id);
      expect(response.status).toBe(200);
      expect(response.headers.etag).toBe("1");
      const body = response.body as PatientDetailResponseBody;
      expect(body).toEqual({
        id: created.id,
        patientNumber: created.patientNumber,
        status: "active",
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        contactUnavailable: false,
        email: null,
        dateOfBirth: null,
        sex: "unspecified",
        nationality: "iranian",
        identifierNumber: "1234567891",
        province: "تهران",
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
        occupation: null,
        referralSource: null,
        preferredLanguage: "fa-IR",
        version: 1,
      });
    });

    it("returns 404 PATIENT_NOT_FOUND for an unknown ID", async () => {
      const credentials = await seedActiveSession();
      const response = await getById(credentials, randomUUID());
      expect(response.status).toBe(404);
      expect((response.body as ErrorResponseBody).code).toBe("PATIENT_NOT_FOUND");
    });

    // Object-level authorization, not just endpoint-level: a valid patient
    // ID that simply belongs to someone else's office must not be
    // distinguishable from an ID that doesn't exist at all.
    it("returns 404 PATIENT_NOT_FOUND for a patient that belongs to another office", async () => {
      const ownerCredentials = await seedActiveSession();
      const created = await createPatient(ownerCredentials, {
        nativeName: "رضا احمدی",
        contactUnavailable: true,
      });

      const otherCredentials = await seedActiveSession();
      const response = await getById(otherCredentials, created.id);
      expect(response.status).toBe(404);
      expect((response.body as ErrorResponseBody).code).toBe("PATIENT_NOT_FOUND");
    });

    // system_administrator deliberately carries no patient permissions at
    // all by default (identity-access rule 6) — a clean 403 subject.
    it("returns 403 MISSING_PERMISSION for a system_administrator", async () => {
      const ownerCredentials = await seedActiveSession();
      const created = await createPatient(ownerCredentials, {
        nativeName: "رضا احمدی",
        contactUnavailable: true,
      });

      const adminCredentials = await seedActiveSession("system_administrator");
      const response = await getById(adminCredentials, created.id);
      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("MISSING_PERMISSION");
    });

    it("returns 400 for a malformed ID rather than reaching the database", async () => {
      const credentials = await seedActiveSession();
      const response = await getById(credentials, "not-a-uuid");
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /patients/:id", () => {
    function patchDemographics(
      credentials: { sessionToken: string; csrfToken: string },
      id: string,
      body: Record<string, unknown>,
      ifMatch?: string,
    ): request.Test {
      const req = request(app.getHttpServer())
        .patch(`/api/v1/patients/${id}`)
        .set(
          "Cookie",
          `${SESSION_COOKIE_NAME}=${credentials.sessionToken}; ${CSRF_COOKIE_NAME}=${credentials.csrfToken}`,
        )
        .set("X-CSRF-Token", credentials.csrfToken);
      if (ifMatch !== undefined) {
        req.set("If-Match", ifMatch);
      }
      return req.send(body);
    }

    it("returns 401 with no session cookie", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/patients/${randomUUID()}`)
        .send({ nativeName: "رضا احمدی" });
      expect(response.status).toBe(401);
    });

    it("corrects demographics, returns the fresh record with a bumped ETag, and writes a PHI-safe audit event", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, {
        nativeName: "زهرا کریمی",
        phone: "09123456789",
        province: "تهران",
      });

      const response = await patchDemographics(
        credentials,
        created.id,
        {
          nativeName: "زهرا کریمی‌نژاد",
          phone: "09129999999",
          province: "اصفهان",
          city: "اصفهان",
        },
        "1",
      );

      expect(response.status).toBe(200);
      expect(response.headers.etag).toBe("2");
      const body = response.body as PatientDetailResponseBody;
      expect(body.nativeName).toBe("زهرا کریمی‌نژاد");
      expect(body.phone).toBe("09129999999");
      expect(body.province).toBe("اصفهان");
      expect(body.city).toBe("اصفهان");
      expect(body.version).toBe(2);

      const auditRows = await auditEventOrmRepo.find({ where: { entityId: created.id } });
      const updateEvent = auditRows.find((row) => row.action === "patient_demographics_updated");
      expect(updateEvent).toBeDefined();
      expect(updateEvent?.detail).toContain("nativeName");
      expect(updateEvent?.detail).toContain("phone");
      expect(updateEvent?.detail).toContain("address");
      // PHI-safe: field names only, never the actual new/old values.
      expect(updateEvent?.detail).not.toContain("زهرا کریمی‌نژاد");
      expect(updateEvent?.detail).not.toContain("09129999999");
    });

    it("adds email, occupation, and referralSource as a correction, and updates the same email row rather than duplicating it on a second edit", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, {
        nativeName: "زهرا کریمی",
        contactUnavailable: true,
      });

      const first = await patchDemographics(
        credentials,
        created.id,
        {
          nativeName: "زهرا کریمی",
          contactUnavailable: true,
          email: "zahra@example.com",
          occupation: "دندانپزشک",
          referralSource: "اینستاگرام",
        },
        "1",
      );
      expect(first.status).toBe(200);
      let body = first.body as PatientDetailResponseBody;
      expect(body.email).toBe("zahra@example.com");
      expect(body.occupation).toBe("دندانپزشک");
      expect(body.referralSource).toBe("اینستاگرام");

      const second = await patchDemographics(
        credentials,
        created.id,
        {
          nativeName: "زهرا کریمی",
          contactUnavailable: true,
          email: "zahra.new@example.com",
          occupation: "دندانپزشک",
          referralSource: "اینستاگرام",
        },
        "2",
      );
      expect(second.status).toBe(200);
      body = second.body as PatientDetailResponseBody;
      expect(body.email).toBe("zahra.new@example.com");

      const rows: unknown[] = await auditEventOrmRepo.manager.query(
        'SELECT 1 FROM "patient_contact" WHERE "patient_id" = $1 AND "contact_type" = \'email\'',
        [created.id],
      );
      expect(rows).toHaveLength(1);
    });

    it("returns 400 INVALID_EMAIL for an unrecognizable email address", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, { nativeName: "رضا احمدی", contactUnavailable: true });

      const response = await patchDemographics(
        credentials,
        created.id,
        { nativeName: "رضا احمدی", contactUnavailable: true, email: "not-an-email" },
        "1",
      );
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_EMAIL");
    });

    it("preserves the prior native name as history rather than overwriting it", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, { nativeName: "رضا احمدی", contactUnavailable: true });

      await patchDemographics(
        credentials,
        created.id,
        { nativeName: "رضا احمدی‌نژاد", contactUnavailable: true },
        "1",
      );

      const rows: Array<{ original_value: string; is_current: boolean }> =
        await auditEventOrmRepo.manager.query(
          'SELECT "original_value", "is_current" FROM "patient_name" WHERE "patient_id" = $1 AND "name_type" = \'native\' ORDER BY "created_at"',
          [created.id],
        );
      expect(rows).toEqual([
        { original_value: "رضا احمدی", is_current: false },
        { original_value: "رضا احمدی‌نژاد", is_current: true },
      ]);
    });

    it("returns 412 MISSING_IF_MATCH when the header is absent", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, { nativeName: "رضا احمدی", contactUnavailable: true });

      const response = await patchDemographics(credentials, created.id, {
        nativeName: "رضا احمدی‌نژاد",
        contactUnavailable: true,
      });
      expect(response.status).toBe(412);
      expect((response.body as ErrorResponseBody).code).toBe("MISSING_IF_MATCH");
    });

    it("returns 412 VERSION_CONFLICT for a stale If-Match, and leaves the record unchanged", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, { nativeName: "رضا احمدی", contactUnavailable: true });

      const response = await patchDemographics(
        credentials,
        created.id,
        { nativeName: "رضا احمدی‌نژاد", contactUnavailable: true },
        "99",
      );
      expect(response.status).toBe(412);
      expect((response.body as ErrorResponseBody).code).toBe("VERSION_CONFLICT");

      const stillOriginal = await getById(credentials, created.id);
      expect((stillOriginal.body as PatientDetailResponseBody).nativeName).toBe("رضا احمدی");
    });

    it("returns 404 PATIENT_NOT_FOUND for an unknown ID", async () => {
      const credentials = await seedActiveSession();
      const response = await patchDemographics(
        credentials,
        randomUUID(),
        { nativeName: "رضا احمدی", contactUnavailable: true },
        "1",
      );
      expect(response.status).toBe(404);
      expect((response.body as ErrorResponseBody).code).toBe("PATIENT_NOT_FOUND");
    });

    it("returns 404 PATIENT_NOT_FOUND for a patient in another office", async () => {
      const ownerCredentials = await seedActiveSession();
      const created = await createPatient(ownerCredentials, {
        nativeName: "رضا احمدی",
        contactUnavailable: true,
      });

      const otherCredentials = await seedActiveSession();
      const response = await patchDemographics(
        otherCredentials,
        created.id,
        { nativeName: "دستکاری", contactUnavailable: true },
        "1",
      );
      expect(response.status).toBe(404);
      expect((response.body as ErrorResponseBody).code).toBe("PATIENT_NOT_FOUND");
    });

    // cashier carries patient.view but deliberately not patient.edit-demographics
    // (01-product/04-roles-and-permissions.md) — proves the guard checks the
    // specific code, the same distinction POST /patients's own test makes.
    it("returns 403 MISSING_PERMISSION for a cashier", async () => {
      const ownerCredentials = await seedActiveSession();
      const created = await createPatient(ownerCredentials, {
        nativeName: "رضا احمدی",
        contactUnavailable: true,
      });

      const cashierCredentials = await seedActiveSession("cashier");
      const response = await patchDemographics(
        cashierCredentials,
        created.id,
        { nativeName: "دستکاری", contactUnavailable: true },
        "1",
      );
      expect(response.status).toBe(403);
      expect((response.body as ErrorResponseBody).code).toBe("MISSING_PERMISSION");
    });

    it("returns 400 INVALID_PHONE for an unrecognizable phone number", async () => {
      const credentials = await seedActiveSession();
      const created = await createPatient(credentials, { nativeName: "رضا احمدی", contactUnavailable: true });

      const response = await patchDemographics(
        credentials,
        created.id,
        { nativeName: "رضا احمدی", phone: "02112345678" },
        "1",
      );
      expect(response.status).toBe(400);
      expect((response.body as ErrorResponseBody).code).toBe("INVALID_PHONE");
    });
  });
});
