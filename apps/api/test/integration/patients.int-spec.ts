import "reflect-metadata";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { asUuid, canonicalizeIranianMobile, normalizeForSearch } from "@dentix/kernel";
import { AuditEvent } from "../../src/modules/audit/domain/entities/audit-event.entity";
import { AuditEventOrmEntity } from "../../src/modules/audit/infrastructure/persistence/audit-event.orm-entity";
import { TypeOrmAuditEventRepository } from "../../src/modules/audit/infrastructure/persistence/audit-event.typeorm-repository";
import { UserAccount } from "../../src/modules/identity-access/domain/entities/user-account.entity";
import { UserAccountOrmEntity } from "../../src/modules/identity-access/infrastructure/persistence/user-account.orm-entity";
import { TypeOrmUserAccountRepository } from "../../src/modules/identity-access/infrastructure/persistence/user-account.typeorm-repository";
import { Office } from "../../src/modules/office-administration/domain/entities/office.entity";
import { OfficeOrmEntity } from "../../src/modules/office-administration/infrastructure/persistence/office.orm-entity";
import { TypeOrmOfficeRepository } from "../../src/modules/office-administration/infrastructure/persistence/office.typeorm-repository";
import { PatientAddress } from "../../src/modules/patients/domain/entities/patient-address.entity";
import { Patient } from "../../src/modules/patients/domain/entities/patient.entity";
import { PatientContact } from "../../src/modules/patients/domain/entities/patient-contact.entity";
import { PatientIdentifier } from "../../src/modules/patients/domain/entities/patient-identifier.entity";
import { PatientName } from "../../src/modules/patients/domain/entities/patient-name.entity";
import { PatientAddressOrmEntity } from "../../src/modules/patients/infrastructure/persistence/patient-address.orm-entity";
import { TypeOrmPatientAddressRepository } from "../../src/modules/patients/infrastructure/persistence/patient-address.typeorm-repository";
import { PatientContactOrmEntity } from "../../src/modules/patients/infrastructure/persistence/patient-contact.orm-entity";
import { TypeOrmPatientContactRepository } from "../../src/modules/patients/infrastructure/persistence/patient-contact.typeorm-repository";
import { PatientIdentifierOrmEntity } from "../../src/modules/patients/infrastructure/persistence/patient-identifier.orm-entity";
import { TypeOrmPatientIdentifierRepository } from "../../src/modules/patients/infrastructure/persistence/patient-identifier.typeorm-repository";
import { PatientNameOrmEntity } from "../../src/modules/patients/infrastructure/persistence/patient-name.orm-entity";
import { TypeOrmPatientNameRepository } from "../../src/modules/patients/infrastructure/persistence/patient-name.typeorm-repository";
import { PatientOrmEntity } from "../../src/modules/patients/infrastructure/persistence/patient.orm-entity";
import { TypeOrmPatientRepository } from "../../src/modules/patients/infrastructure/persistence/patient.typeorm-repository";
import { TypeOrmUnitOfWork } from "../../src/platform/typeorm-unit-of-work";
import { dataSourceOptions } from "../../src/persistence/data-source";

interface PatientNameRow {
  readonly original_value: string;
  readonly normalized_value: string;
}

describe("Patients persistence (integration)", () => {
  let dataSource: DataSource | undefined;
  let officeRepo: TypeOrmOfficeRepository;
  let userAccountRepo: TypeOrmUserAccountRepository;
  let patientRepo: TypeOrmPatientRepository;
  let patientNameRepo: TypeOrmPatientNameRepository;
  let patientContactRepo: TypeOrmPatientContactRepository;
  let patientIdentifierRepo: TypeOrmPatientIdentifierRepository;
  let patientAddressRepo: TypeOrmPatientAddressRepository;
  let auditEventRepo: TypeOrmAuditEventRepository;
  let unitOfWork: TypeOrmUnitOfWork;

  beforeAll(async () => {
    dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
    officeRepo = new TypeOrmOfficeRepository(dataSource.getRepository(OfficeOrmEntity));
    userAccountRepo = new TypeOrmUserAccountRepository(dataSource.getRepository(UserAccountOrmEntity));
    patientRepo = new TypeOrmPatientRepository(dataSource.getRepository(PatientOrmEntity));
    patientNameRepo = new TypeOrmPatientNameRepository(dataSource.getRepository(PatientNameOrmEntity));
    patientContactRepo = new TypeOrmPatientContactRepository(
      dataSource.getRepository(PatientContactOrmEntity),
    );
    patientIdentifierRepo = new TypeOrmPatientIdentifierRepository(
      dataSource.getRepository(PatientIdentifierOrmEntity),
    );
    patientAddressRepo = new TypeOrmPatientAddressRepository(
      dataSource.getRepository(PatientAddressOrmEntity),
    );
    auditEventRepo = new TypeOrmAuditEventRepository(dataSource.getRepository(AuditEventOrmEntity));
    unitOfWork = new TypeOrmUnitOfWork(dataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE "patient_address", "patient_identifier", "patient_contact", "patient_name", "patient", "patient_number_sequence", "audit_event", "user_account", "office" CASCADE',
      );
      await dataSource.destroy();
    }
  });

  async function seedOfficeAndActor(): Promise<{
    officeId: ReturnType<typeof asUuid>;
    actorUserId: ReturnType<typeof asUuid>;
  }> {
    const office = Office.create({
      id: asUuid(randomUUID()),
      code: `p-${randomUUID().slice(0, 6)}`,
      timezone: "Asia/Tehran",
    });
    await officeRepo.create(office);
    const account = UserAccount.create({
      id: asUuid(randomUUID()),
      externalSubject: `sub-${randomUUID()}`,
      issuer: "https://kc.local",
      displayName: "Dr. Test",
    });
    await userAccountRepo.create(account);
    return { officeId: office.id, actorUserId: account.id };
  }

  /** A bare active patient row — child-table tests (name/contact/identifier/address) need one to satisfy the FK, but don't care about its own fields. */
  async function seedPatient(): Promise<{
    officeId: ReturnType<typeof asUuid>;
    actorUserId: ReturnType<typeof asUuid>;
    patientId: ReturnType<typeof asUuid>;
  }> {
    const { officeId, actorUserId } = await seedOfficeAndActor();
    const patientId = asUuid(randomUUID());
    await patientRepo.create(
      Patient.create({
        id: patientId,
        officeId,
        patientNumber: await patientRepo.nextPatientNumber(officeId),
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now: new Date(),
      }),
    );
    return { officeId, actorUserId, patientId };
  }

  describe("nextPatientNumber", () => {
    it("allocates sequential numbers per office starting at 1", async () => {
      const { officeId } = await seedOfficeAndActor();
      expect(await patientRepo.nextPatientNumber(officeId)).toBe(1);
      expect(await patientRepo.nextPatientNumber(officeId)).toBe(2);
      expect(await patientRepo.nextPatientNumber(officeId)).toBe(3);
    });

    it("keeps separate counters per office", async () => {
      const { officeId: officeA } = await seedOfficeAndActor();
      const { officeId: officeB } = await seedOfficeAndActor();
      expect(await patientRepo.nextPatientNumber(officeA)).toBe(1);
      expect(await patientRepo.nextPatientNumber(officeB)).toBe(1);
      expect(await patientRepo.nextPatientNumber(officeA)).toBe(2);
    });

    it("never allocates the same number twice under concurrent calls", async () => {
      const { officeId } = await seedOfficeAndActor();
      const numbers = await Promise.all(
        Array.from({ length: 10 }, () => patientRepo.nextPatientNumber(officeId)),
      );
      expect(new Set(numbers).size).toBe(10);
    });
  });

  describe("create + round trip", () => {
    it("persists a patient with its native name and phone contact, original values preserved", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patient = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: false,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(patient);

      const nativeName = PatientName.create({
        id: asUuid(randomUUID()),
        patientId: patient.id,
        nameType: "native",
        value: "علي رضایی",
        createdBy: actorUserId,
        now,
      });
      await patientNameRepo.create(nativeName);

      const contact = PatientContact.create({
        id: asUuid(randomUUID()),
        patientId: patient.id,
        contactType: "mobile_phone",
        rawValue: "09123456789",
        createdBy: actorUserId,
        now,
      });
      await patientContactRepo.create(contact);

      const reloaded = await patientRepo.findById(patient.id);
      expect(reloaded?.patientNumber).toBe(patientNumber);
      expect(reloaded?.status).toBe("active");
      expect(reloaded?.nationality).toBe("iranian");

      // The original, as-entered value survives untouched — only the
      // normalized_value column reflects Yeh normalization.
      const nameRows: PatientNameRow[] = await dataSource!.query(
        'SELECT * FROM "patient_name" WHERE "patient_id" = $1',
        [patient.id],
      );
      expect(nameRows[0]?.original_value).toBe("علي رضایی");
      expect(nameRows[0]?.normalized_value).toBe("علی رضایی");
    });

    it("persists an optional national-code identifier, original value preserved and canonicalized separately", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patient = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(patient);

      const identifier = PatientIdentifier.create({
        id: asUuid(randomUUID()),
        patientId: patient.id,
        identifierType: "national_code",
        rawValue: "۱۲۳۴۵۶۷۸۹۱", // Persian digits, as-entered
        createdBy: actorUserId,
        now,
      });
      await patientIdentifierRepo.create(identifier);

      const rows: Array<{ original_value: string; normalized_value: string; identifier_type: string }> =
        await dataSource!.query('SELECT * FROM "patient_identifier" WHERE "patient_id" = $1', [patient.id]);
      expect(rows[0]?.identifier_type).toBe("national_code");
      expect(rows[0]?.original_value).toBe("۱۲۳۴۵۶۷۸۹۱");
      expect(rows[0]?.normalized_value).toBe("1234567891");
    });

    it("persists an optional passport identifier for a foreign patient, canonicalized separately", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patient = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber,
        dateOfBirth: null,
        sex: "unspecified",
        nationality: "foreign",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(patient);

      const identifier = PatientIdentifier.create({
        id: asUuid(randomUUID()),
        patientId: patient.id,
        identifierType: "passport",
        rawValue: "ab 123-4567", // as a receptionist might copy it off a printed passport
        createdBy: actorUserId,
        now,
      });
      await patientIdentifierRepo.create(identifier);

      const rows: Array<{ original_value: string; normalized_value: string; identifier_type: string }> =
        await dataSource!.query('SELECT * FROM "patient_identifier" WHERE "patient_id" = $1', [patient.id]);
      expect(rows[0]?.identifier_type).toBe("passport");
      expect(rows[0]?.original_value).toBe("ab 123-4567");
      expect(rows[0]?.normalized_value).toBe("AB1234567");

      const [patientRow]: Array<{ nationality: string }> = await dataSource!.query(
        'SELECT "nationality" FROM "patient" WHERE "id" = $1',
        [patient.id],
      );
      expect(patientRow?.nationality).toBe("foreign");
    });

    it("persists an optional address with structured Iranian fields, trimmed", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patient = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(patient);

      const address = PatientAddress.create({
        id: asUuid(randomUUID()),
        patientId: patient.id,
        province: " تهران ",
        city: "تهران",
        district: "ونک",
        addressLine1: "خیابان ولیعصر",
        addressLine2: null,
        postalCode: "1234567890",
        deliveryNotes: null,
        createdBy: actorUserId,
        now,
      });
      await patientAddressRepo.create(address);

      const rows: Array<{ province: string; city: string; postal_code: string; address_line2: null }> =
        await dataSource!.query('SELECT * FROM "patient_address" WHERE "patient_id" = $1', [patient.id]);
      expect(rows[0]?.province).toBe("تهران");
      expect(rows[0]?.city).toBe("تهران");
      expect(rows[0]?.postal_code).toBe("1234567890");
      expect(rows[0]?.address_line2).toBeNull();
    });

    it("rejects a second address for the same patient", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patient = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(patient);

      await patientAddressRepo.create(
        PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId: patient.id,
          city: "تهران",
          createdBy: actorUserId,
          now,
        }),
      );
      await expect(
        patientAddressRepo.create(
          PatientAddress.create({
            id: asUuid(randomUUID()),
            patientId: patient.id,
            city: "شیراز",
            createdBy: actorUserId,
            now,
          }),
        ),
      ).rejects.toThrow(/duplicate key value/i);
    });

    it("enforces (office_id, patient_number) uniqueness", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const first = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber: 1,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      const second = Patient.create({
        id: asUuid(randomUUID()),
        officeId,
        patientNumber: 1,
        dateOfBirth: null,
        sex: "unspecified",
        contactUnavailable: true,
        createdBy: actorUserId,
        now,
      });
      await patientRepo.create(first);
      await expect(patientRepo.create(second)).rejects.toThrow(/duplicate key value/i);
    });

    it("persists email alongside phone as a second patient_contact row, plus occupation/referralSource, all visible via findDetailById", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId,
          patientNumber: await patientRepo.nextPatientNumber(officeId),
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: false,
          occupation: "دندانپزشک",
          referralSource: "اینستاگرام",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09123456789",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "email",
          rawValue: "Zahra@Example.com",
          createdBy: actorUserId,
          now,
        }),
      );

      const detail = await patientRepo.findDetailById(officeId, patientId);
      expect(detail?.phone).toBe("09123456789");
      expect(detail?.email).toBe("Zahra@Example.com");
      expect(detail?.occupation).toBe("دندانپزشک");
      expect(detail?.referralSource).toBe("اینستاگرام");
      expect(detail?.preferredLanguage).toBe("fa-IR");

      // Two rows for one patient — the whole point of the widened CHECK
      // constraint and the per-type join in findDetailById.
      const rows: unknown[] = await dataSource!.query(
        'SELECT 1 FROM "patient_contact" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toHaveLength(2);
    });
  });

  describe("transactional create (patient + name + audit)", () => {
    it("commits patient, name, and audit event together", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientId = asUuid(randomUUID());

      await unitOfWork.runInTransaction(async (tx) => {
        const patientNumber = await patientRepo.nextPatientNumber(officeId, tx);
        const patient = Patient.create({
          id: patientId,
          officeId,
          patientNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        });
        await patientRepo.create(patient, tx);
        await patientNameRepo.create(
          PatientName.create({
            id: asUuid(randomUUID()),
            patientId,
            nameType: "native",
            value: "تست",
            createdBy: actorUserId,
            now,
          }),
          tx,
        );
        await auditEventRepo.create(
          AuditEvent.create({
            id: asUuid(randomUUID()),
            officeId,
            actorUserId,
            action: "patient_created",
            entityType: "patient",
            entityId: patientId,
            detail: null,
            now,
          }),
          tx,
        );
      });

      expect(await patientRepo.findById(patientId)).not.toBeNull();
      const nameRows: unknown[] = await dataSource!.query(
        'SELECT * FROM "patient_name" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(nameRows[0]).toBeDefined();
      const auditRows: unknown[] = await dataSource!.query(
        'SELECT * FROM "audit_event" WHERE "entity_id" = $1 AND "action" = $2',
        [patientId, "patient_created"],
      );
      expect(auditRows[0]).toBeDefined();
    });

    it("rolls back the patient and name when the transaction fails before the audit write", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientId = asUuid(randomUUID());

      await expect(
        unitOfWork.runInTransaction(async (tx) => {
          const patientNumber = await patientRepo.nextPatientNumber(officeId, tx);
          const patient = Patient.create({
            id: patientId,
            officeId,
            patientNumber,
            dateOfBirth: null,
            sex: "unspecified",
            contactUnavailable: true,
            createdBy: actorUserId,
            now,
          });
          await patientRepo.create(patient, tx);
          throw new Error("simulated failure before audit write");
        }),
      ).rejects.toThrow("simulated failure before audit write");

      expect(await patientRepo.findById(patientId)).toBeNull();
    });
  });

  describe("search", () => {
    // Regression: the query was interpolated into ILIKE '%'||$2||'%' with no
    // escaping, so LIKE metacharacters were treated as wildcards — searching
    // "%" returned every patient in the office instead of none.
    it("treats LIKE wildcards in the query as literal characters, not patterns", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId,
          patientNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        }),
      );
      await patientNameRepo.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: "مریم حسینی",
          createdBy: actorUserId,
          now,
        }),
      );

      for (const wildcard of ["%", "_"]) {
        const results = await patientRepo.search({
          officeId,
          normalizedQuery: wildcard,
          canonicalPhoneQuery: null,
          patientNumberQuery: null,
          limit: 10,
        });
        expect(results.map((r) => r.id)).not.toContain(patientId);
      }

      // Sanity: the seeded patient is genuinely findable by a real term, so
      // the assertions above aren't passing because the row is missing.
      const realHit = await patientRepo.search({
        officeId,
        normalizedQuery: normalizeForSearch("مریم"),
        canonicalPhoneQuery: null,
        patientNumberQuery: null,
        limit: 10,
      });
      expect(realHit.map((r) => r.id)).toContain(patientId);
    });

    it("matches by partial normalized native name regardless of Yeh variant typed", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId,
          patientNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        }),
      );
      await patientNameRepo.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: "علی رضایی",
          createdBy: actorUserId,
          now,
        }),
      );

      const results = await patientRepo.search({
        officeId,
        normalizedQuery: normalizeForSearch("علي"), // Arabic Yeh — must still match
        canonicalPhoneQuery: null,
        patientNumberQuery: null,
        limit: 10,
      });
      expect(results.map((r) => r.id)).toContain(patientId);
      expect(results.find((r) => r.id === patientId)?.nativeName).toBe("علی رضایی");
    });

    it("matches the same patient by phone regardless of which accepted form was typed", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId,
          patientNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: false,
          createdBy: actorUserId,
          now,
        }),
      );
      await patientNameRepo.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: "بیمار تست",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09123456789",
          createdBy: actorUserId,
          now,
        }),
      );

      for (const typedForm of ["09123456789", "+989123456789", "00989123456789", "۰۹۱۲۳۴۵۶۷۸۹"]) {
        const results = await patientRepo.search({
          officeId,
          normalizedQuery: "",
          canonicalPhoneQuery: canonicalizeIranianMobile(typedForm),
          patientNumberQuery: null,
          limit: 10,
        });
        expect(results.map((r) => r.id)).toContain(patientId);
      }
    });

    it("lists recent patients when the query is empty", async () => {
      const { officeId } = await seedOfficeAndActor();
      const results = await patientRepo.search({
        officeId,
        normalizedQuery: "",
        canonicalPhoneQuery: null,
        patientNumberQuery: null,
        limit: 10,
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("matches by exact patient_number, and only that patient", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();

      const targetNumber = await patientRepo.nextPatientNumber(officeId);
      const targetId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: targetId,
          officeId,
          patientNumber: targetNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        }),
      );

      // A second patient in the same office, whose own number must NOT match
      // a search for the first one's number.
      const otherNumber = await patientRepo.nextPatientNumber(officeId);
      await patientRepo.create(
        Patient.create({
          id: asUuid(randomUUID()),
          officeId,
          patientNumber: otherNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        }),
      );

      // normalizedQuery is the same digit string, not "" — an empty
      // normalizedQuery means "list mode" in the WHERE clause's `$2 = ''`
      // branch, which returns every patient in the office regardless of
      // patientNumberQuery. SearchPatientsUseCase never actually calls the
      // repository this way (patientNumberQuery is only ever non-null when
      // raw, and therefore normalizedQuery, is also non-empty) — passing ""
      // here failed by exercising a combination production code never
      // produces, not by finding a real bug in the SQL.
      const results = await patientRepo.search({
        officeId,
        normalizedQuery: String(targetNumber),
        canonicalPhoneQuery: null,
        patientNumberQuery: targetNumber,
        limit: 10,
      });
      expect(results.map((r) => r.id)).toEqual([targetId]);
    });
  });

  describe("findDetailById", () => {
    it("returns the full record — names, contact, identifier, address — for a patient in the caller's office", async () => {
      const { officeId, actorUserId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(officeId);
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId,
          patientNumber,
          dateOfBirth: null,
          sex: "female",
          nationality: "iranian",
          contactUnavailable: false,
          createdBy: actorUserId,
          now,
        }),
      );
      await patientNameRepo.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: "زهرا کریمی",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientNameRepo.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "latin",
          value: "Zahra Karimi",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09123456789",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientIdentifierRepo.create(
        PatientIdentifier.create({
          id: asUuid(randomUUID()),
          patientId,
          identifierType: "national_code",
          rawValue: "1234567891",
          createdBy: actorUserId,
          now,
        }),
      );
      await patientAddressRepo.create(
        PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId,
          province: "تهران",
          city: "تهران",
          district: null,
          addressLine1: "خیابان ولیعصر",
          addressLine2: null,
          postalCode: "1234567890",
          deliveryNotes: null,
          createdBy: actorUserId,
          now,
        }),
      );

      const detail = await patientRepo.findDetailById(officeId, patientId);
      expect(detail).toEqual({
        id: patientId,
        patientNumber,
        status: "active",
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        contactUnavailable: false,
        email: null,
        dateOfBirth: null,
        sex: "female",
        nationality: "iranian",
        identifierNumber: "1234567891",
        province: "تهران",
        city: "تهران",
        district: null,
        addressLine1: "خیابان ولیعصر",
        addressLine2: null,
        postalCode: "1234567890",
        deliveryNotes: null,
        occupation: null,
        referralSource: null,
        preferredLanguage: "fa-IR",
        version: 1,
      });
    });

    it("returns null for a patient that belongs to a different office", async () => {
      const { officeId: ownerOfficeId, actorUserId } = await seedOfficeAndActor();
      const { officeId: otherOfficeId } = await seedOfficeAndActor();
      const now = new Date();
      const patientNumber = await patientRepo.nextPatientNumber(ownerOfficeId);
      const patientId = asUuid(randomUUID());
      await patientRepo.create(
        Patient.create({
          id: patientId,
          officeId: ownerOfficeId,
          patientNumber,
          dateOfBirth: null,
          sex: "unspecified",
          contactUnavailable: true,
          createdBy: actorUserId,
          now,
        }),
      );

      expect(await patientRepo.findDetailById(otherOfficeId, patientId)).toBeNull();
    });

    it("returns null for an unknown patient ID", async () => {
      const { officeId } = await seedOfficeAndActor();
      expect(await patientRepo.findDetailById(officeId, asUuid(randomUUID()))).toBeNull();
    });
  });

  describe("updateDemographics", () => {
    it("updates the row and bumps version when expectedVersion matches", async () => {
      const { officeId, actorUserId, patientId } = await seedPatient();

      const succeeded = await patientRepo.updateDemographics({
        officeId,
        id: patientId,
        expectedVersion: 1,
        dateOfBirth: null,
        sex: "female",
        nationality: "foreign",
        contactUnavailable: false,
        updatedBy: actorUserId,
        now: new Date(),
      });
      expect(succeeded).toBe(true);

      const detail = await patientRepo.findDetailById(officeId, patientId);
      expect(detail?.sex).toBe("female");
      expect(detail?.nationality).toBe("foreign");
      expect(detail?.version).toBe(2);
    });

    it("does nothing and returns false when expectedVersion is stale", async () => {
      const { officeId, actorUserId, patientId } = await seedPatient();

      const succeeded = await patientRepo.updateDemographics({
        officeId,
        id: patientId,
        expectedVersion: 99,
        dateOfBirth: null,
        sex: "female",
        nationality: "foreign",
        contactUnavailable: false,
        updatedBy: actorUserId,
        now: new Date(),
      });
      expect(succeeded).toBe(false);

      const detail = await patientRepo.findDetailById(officeId, patientId);
      expect(detail?.sex).toBe("unspecified");
      expect(detail?.version).toBe(1);
    });

    it("returns false for a patient in a different office, even with the correct version", async () => {
      const { actorUserId, patientId } = await seedPatient();
      const { officeId: otherOfficeId } = await seedOfficeAndActor();

      const succeeded = await patientRepo.updateDemographics({
        officeId: otherOfficeId,
        id: patientId,
        expectedVersion: 1,
        dateOfBirth: null,
        sex: "female",
        nationality: "iranian",
        contactUnavailable: false,
        updatedBy: actorUserId,
        now: new Date(),
      });
      expect(succeeded).toBe(false);
    });

    // The whole point of an atomic `WHERE version = $expected` UPDATE: only
    // one of two simultaneous edits can ever win, never both silently
    // applying on top of each other.
    it("lets only one of two concurrent updates against the same version succeed", async () => {
      const { officeId, actorUserId, patientId } = await seedPatient();

      const results = await Promise.all([
        patientRepo.updateDemographics({
          officeId,
          id: patientId,
          expectedVersion: 1,
          dateOfBirth: null,
          sex: "male",
          nationality: "iranian",
          contactUnavailable: true,
          updatedBy: actorUserId,
          now: new Date(),
        }),
        patientRepo.updateDemographics({
          officeId,
          id: patientId,
          expectedVersion: 1,
          dateOfBirth: null,
          sex: "female",
          nationality: "iranian",
          contactUnavailable: true,
          updatedBy: actorUserId,
          now: new Date(),
        }),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      const detail = await patientRepo.findDetailById(officeId, patientId);
      expect(detail?.version).toBe(2);
    });
  });

  describe("patient_name.replaceCurrent", () => {
    it("preserves the prior name as history instead of overwriting it", async () => {
      const { actorUserId, patientId } = await seedPatient();
      const firstNow = new Date();
      const original = PatientName.create({
        id: asUuid(randomUUID()),
        patientId,
        nameType: "native",
        value: "رضا احمدی",
        createdBy: actorUserId,
        now: firstNow,
      });
      await patientNameRepo.create(original);

      const laterNow = new Date(firstNow.getTime() + 1000);
      await patientNameRepo.replaceCurrent(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: "رضا احمدی‌نژاد",
          createdBy: actorUserId,
          now: laterNow,
        }),
      );

      const rows: Array<{ original_value: string; is_current: boolean }> = await dataSource!.query(
        'SELECT "original_value", "is_current" FROM "patient_name" WHERE "patient_id" = $1 ORDER BY "created_at"',
        [patientId],
      );
      expect(rows).toEqual([
        { original_value: "رضا احمدی", is_current: false },
        { original_value: "رضا احمدی‌نژاد", is_current: true },
      ]);
    });
  });

  describe("patient_contact.upsert / remove", () => {
    it("updates the existing row in place rather than appending a second one", async () => {
      const { actorUserId, patientId } = await seedPatient();
      const now = new Date();
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09123456789",
          createdBy: actorUserId,
          now,
        }),
      );

      await patientContactRepo.upsert(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09129999999",
          createdBy: actorUserId,
          now,
        }),
      );

      const rows: Array<{ original_value: string }> = await dataSource!.query(
        'SELECT "original_value" FROM "patient_contact" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toEqual([{ original_value: "09129999999" }]);
    });

    it("inserts when no row exists yet for that patient/type", async () => {
      const { actorUserId, patientId } = await seedPatient();
      await patientContactRepo.upsert(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09121234567",
          createdBy: actorUserId,
          now: new Date(),
        }),
      );

      const rows: unknown[] = await dataSource!.query(
        'SELECT 1 FROM "patient_contact" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toHaveLength(1);
    });

    it("removes the row entirely so a cleared phone can't keep surfacing", async () => {
      const { actorUserId, patientId } = await seedPatient();
      await patientContactRepo.create(
        PatientContact.create({
          id: asUuid(randomUUID()),
          patientId,
          contactType: "mobile_phone",
          rawValue: "09123456789",
          createdBy: actorUserId,
          now: new Date(),
        }),
      );

      await patientContactRepo.remove(patientId, "mobile_phone");

      const rows: unknown[] = await dataSource!.query(
        'SELECT 1 FROM "patient_contact" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toHaveLength(0);
    });
  });

  describe("patient_identifier.upsert / remove", () => {
    it("updates the existing row in place rather than appending a second one", async () => {
      const { actorUserId, patientId } = await seedPatient();
      const now = new Date();
      await patientIdentifierRepo.create(
        PatientIdentifier.create({
          id: asUuid(randomUUID()),
          patientId,
          identifierType: "national_code",
          rawValue: "1234567891",
          createdBy: actorUserId,
          now,
        }),
      );

      await patientIdentifierRepo.upsert(
        PatientIdentifier.create({
          id: asUuid(randomUUID()),
          patientId,
          identifierType: "passport",
          rawValue: "AB1234567",
          createdBy: actorUserId,
          now,
        }),
      );

      const rows: Array<{ identifier_type: string; original_value: string }> = await dataSource!.query(
        'SELECT "identifier_type", "original_value" FROM "patient_identifier" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toEqual([{ identifier_type: "passport", original_value: "AB1234567" }]);
    });

    it("removes the row entirely when cleared", async () => {
      const { actorUserId, patientId } = await seedPatient();
      await patientIdentifierRepo.create(
        PatientIdentifier.create({
          id: asUuid(randomUUID()),
          patientId,
          identifierType: "national_code",
          rawValue: "1234567891",
          createdBy: actorUserId,
          now: new Date(),
        }),
      );

      await patientIdentifierRepo.remove(patientId);

      const rows: unknown[] = await dataSource!.query(
        'SELECT 1 FROM "patient_identifier" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toHaveLength(0);
    });
  });

  describe("patient_address.upsert / remove", () => {
    it("updates the existing row in place, bumping its own version", async () => {
      const { actorUserId, patientId } = await seedPatient();
      const now = new Date();
      await patientAddressRepo.create(
        PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId,
          province: "تهران",
          createdBy: actorUserId,
          now,
        }),
      );

      await patientAddressRepo.upsert({
        address: PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId,
          province: "اصفهان",
          createdBy: actorUserId,
          now,
        }),
        updatedBy: actorUserId,
        now: new Date(now.getTime() + 1000),
      });

      const rows: Array<{ province: string; version: number }> = await dataSource!.query(
        'SELECT "province", "version" FROM "patient_address" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toEqual([{ province: "اصفهان", version: 2 }]);
    });

    it("removes the row when every field is cleared back to empty", async () => {
      const { actorUserId, patientId } = await seedPatient();
      await patientAddressRepo.create(
        PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId,
          province: "تهران",
          createdBy: actorUserId,
          now: new Date(),
        }),
      );

      await patientAddressRepo.remove(patientId);

      const rows: unknown[] = await dataSource!.query(
        'SELECT 1 FROM "patient_address" WHERE "patient_id" = $1',
        [patientId],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
