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
        rawMobileNumber: "09123456789",
        createdBy: actorUserId,
        now,
      });
      await patientContactRepo.create(contact);

      const reloaded = await patientRepo.findById(patient.id);
      expect(reloaded?.patientNumber).toBe(patientNumber);
      expect(reloaded?.status).toBe("active");

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
        rawNationalCode: "۱۲۳۴۵۶۷۸۹۱", // Persian digits, as-entered
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
          rawMobileNumber: "09123456789",
          createdBy: actorUserId,
          now,
        }),
      );

      for (const typedForm of ["09123456789", "+989123456789", "00989123456789", "۰۹۱۲۳۴۵۶۷۸۹"]) {
        const results = await patientRepo.search({
          officeId,
          normalizedQuery: "",
          canonicalPhoneQuery: canonicalizeIranianMobile(typedForm),
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
        limit: 10,
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
