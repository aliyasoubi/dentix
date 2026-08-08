import { Inject, Injectable } from "@nestjs/common";
import { asUuid, canonicalizeIranianMobile, fail, ok, Result, Uuid } from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent, AUDIT_EVENT_REPOSITORY } from "../../../audit/public-api";
import type { AuditEventRepository } from "../../../audit/public-api";
import { Patient, PatientSex } from "../../domain/entities/patient.entity";
import { PatientContact } from "../../domain/entities/patient-contact.entity";
import { PatientName } from "../../domain/entities/patient-name.entity";
import { PATIENT_CONTACT_REPOSITORY } from "../../domain/repositories/patient-contact.repository";
import type { PatientContactRepository } from "../../domain/repositories/patient-contact.repository";
import { PATIENT_NAME_REPOSITORY } from "../../domain/repositories/patient-name.repository";
import type { PatientNameRepository } from "../../domain/repositories/patient-name.repository";
import { PATIENT_REPOSITORY } from "../../domain/repositories/patient.repository";
import type { PatientRepository } from "../../domain/repositories/patient.repository";
import { UNIT_OF_WORK_PORT } from "../../../../platform/unit-of-work.port";
import type { UnitOfWorkPort } from "../../../../platform/unit-of-work.port";

export type CreatePatientErrorCode =
  | "NATIVE_NAME_REQUIRED"
  | "INVALID_PHONE"
  | "CONTACT_REQUIRED"
  | "INVALID_DATE_OF_BIRTH";

export interface CreatePatientCommand {
  readonly officeId: Uuid;
  readonly actorUserId: Uuid;
  readonly nativeName: string;
  readonly latinName?: string | null;
  readonly phone?: string | null;
  /** Only meaningful when phone is omitted — 01-patient-management.md: "at least one contact method unless explicitly unavailable." */
  readonly contactUnavailable?: boolean;
  readonly sex?: PatientSex;
  /** Canonical Gregorian ISO date string ("YYYY-MM-DD") — "where known" (01-patient-management.md), the Jalali picker converts to this at the UI boundary (ADR-008, ADR-012). */
  readonly dateOfBirth?: string | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses a canonical ISO date string to a UTC-midnight Date, rejecting anything malformed, calendrically invalid, or in the future — matches PatientMapper's own `date`-column convention. */
function parseDateOfBirth(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  const [, year, month, day] = match;
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null; // e.g. 2025-02-30 — regex-shaped but not a real calendar day
  }
  if (date.getTime() > Date.now()) {
    return null; // a birth date can't be in the future
  }
  return date;
}

export interface CreatePatientSuccess {
  readonly id: Uuid;
  readonly patientNumber: number;
}

/**
 * S4's spine use case (02-slices-release-0.5.md). Every write — patient,
 * its name(s), its contact, and the audit record — lands in one
 * transaction (03-module-boundaries.md), same pattern as
 * CompleteLoginUseCase: nothing here should be able to half-succeed.
 */
@Injectable()
export class CreatePatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject(PATIENT_NAME_REPOSITORY) private readonly patientNames: PatientNameRepository,
    @Inject(PATIENT_CONTACT_REPOSITORY) private readonly patientContacts: PatientContactRepository,
    @Inject(AUDIT_EVENT_REPOSITORY) private readonly auditEvents: AuditEventRepository,
    @Inject(UNIT_OF_WORK_PORT) private readonly unitOfWork: UnitOfWorkPort,
  ) {}

  async execute(
    command: CreatePatientCommand,
  ): Promise<Result<CreatePatientSuccess, CreatePatientErrorCode>> {
    const nativeName = command.nativeName.trim();
    if (nativeName.length === 0) {
      return fail("NATIVE_NAME_REQUIRED");
    }

    const latinName = command.latinName?.trim() || null;
    const phone = command.phone?.trim() || null;

    if (phone && !canonicalizeIranianMobile(phone)) {
      return fail("INVALID_PHONE");
    }
    if (!phone && !command.contactUnavailable) {
      return fail("CONTACT_REQUIRED");
    }

    let dateOfBirth: Date | null = null;
    if (command.dateOfBirth) {
      dateOfBirth = parseDateOfBirth(command.dateOfBirth);
      if (!dateOfBirth) {
        return fail("INVALID_DATE_OF_BIRTH");
      }
    }

    const now = new Date();
    const patientId = asUuid(randomUUID());

    const success = await this.unitOfWork.runInTransaction(async (tx) => {
      const patientNumber = await this.patients.nextPatientNumber(command.officeId, tx);
      const patient = Patient.create({
        id: patientId,
        officeId: command.officeId,
        patientNumber,
        dateOfBirth,
        sex: command.sex ?? "unspecified",
        contactUnavailable: !phone,
        createdBy: command.actorUserId,
        now,
      });
      await this.patients.create(patient, tx);

      await this.patientNames.create(
        PatientName.create({
          id: asUuid(randomUUID()),
          patientId,
          nameType: "native",
          value: nativeName,
          createdBy: command.actorUserId,
          now,
        }),
        tx,
      );

      if (latinName) {
        await this.patientNames.create(
          PatientName.create({
            id: asUuid(randomUUID()),
            patientId,
            nameType: "latin",
            value: latinName,
            createdBy: command.actorUserId,
            now,
          }),
          tx,
        );
      }

      if (phone) {
        await this.patientContacts.create(
          PatientContact.create({
            id: asUuid(randomUUID()),
            patientId,
            rawMobileNumber: phone,
            createdBy: command.actorUserId,
            now,
          }),
          tx,
        );
      }

      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: command.officeId,
          actorUserId: command.actorUserId,
          action: "patient_created",
          entityType: "patient",
          entityId: patientId,
          detail: null,
          now,
        }),
        tx,
      );

      return { id: patientId, patientNumber };
    });

    return ok(success);
  }
}
