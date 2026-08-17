import { Inject, Injectable } from "@nestjs/common";
import {
  asUuid,
  canonicalizeIranianMobile,
  canonicalizeIranianNationalCode,
  canonicalizePassportNumber,
  fail,
  ok,
  Result,
  Uuid,
} from "@dentix/kernel";
import { randomUUID } from "crypto";
import { AuditEvent, AUDIT_EVENT_REPOSITORY } from "../../../audit/public-api";
import type { AuditEventRepository } from "../../../audit/public-api";
import { PatientAddress } from "../../domain/entities/patient-address.entity";
import { Patient, PatientNationality, PatientSex } from "../../domain/entities/patient.entity";
import { PatientContact } from "../../domain/entities/patient-contact.entity";
import { PatientIdentifier } from "../../domain/entities/patient-identifier.entity";
import { PatientName } from "../../domain/entities/patient-name.entity";
import { PATIENT_ADDRESS_REPOSITORY } from "../../domain/repositories/patient-address.repository";
import type { PatientAddressRepository } from "../../domain/repositories/patient-address.repository";
import { PATIENT_CONTACT_REPOSITORY } from "../../domain/repositories/patient-contact.repository";
import type { PatientContactRepository } from "../../domain/repositories/patient-contact.repository";
import { PATIENT_IDENTIFIER_REPOSITORY } from "../../domain/repositories/patient-identifier.repository";
import type { PatientIdentifierRepository } from "../../domain/repositories/patient-identifier.repository";
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
  | "INVALID_DATE_OF_BIRTH"
  | "INVALID_NATIONAL_CODE"
  | "INVALID_PASSPORT_NUMBER";

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
  /** Defaults to "iranian" when omitted — see Patient.create()'s own default. Determines which document identifierNumber is validated as. */
  readonly nationality?: PatientNationality;
  /**
   * Optional (01-patient-management.md: "only when legally and
   * operationally justified"); validated when provided, never required.
   * Holds a national code for an "iranian" patient, a passport number for
   * a "foreign" one — which validation applies is `nationality`'s call,
   * not inferred from the value's own shape (a passport number can be all
   * digits too).
   */
  readonly identifierNumber?: string | null;
  /** All optional free text (01-patient-management.md: "remains usable for foreign or nonstandard addresses"); a row is only created if at least one is non-blank. */
  readonly province?: string | null;
  readonly city?: string | null;
  readonly district?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly postalCode?: string | null;
  readonly deliveryNotes?: string | null;
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
 * S4's spine use case (02-slices-release-0.5.md), now carrying R1's
 * patient-registry additions (national code/passport, address,
 * international-patient nationality). Every write — patient, its name(s),
 * its contact, its identifier, its address, and the audit record — lands
 * in one transaction (03-module-boundaries.md), same pattern as
 * CompleteLoginUseCase: nothing here should be able to half-succeed.
 */
@Injectable()
export class CreatePatientUseCase {
  constructor(
    @Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository,
    @Inject(PATIENT_NAME_REPOSITORY) private readonly patientNames: PatientNameRepository,
    @Inject(PATIENT_CONTACT_REPOSITORY) private readonly patientContacts: PatientContactRepository,
    @Inject(PATIENT_IDENTIFIER_REPOSITORY) private readonly patientIdentifiers: PatientIdentifierRepository,
    @Inject(PATIENT_ADDRESS_REPOSITORY) private readonly patientAddresses: PatientAddressRepository,
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

    const nationality = command.nationality ?? "iranian";
    const identifierNumber = command.identifierNumber?.trim() || null;
    if (identifierNumber) {
      const isValid =
        nationality === "iranian"
          ? canonicalizeIranianNationalCode(identifierNumber) !== null
          : canonicalizePassportNumber(identifierNumber) !== null;
      if (!isValid) {
        return fail(nationality === "iranian" ? "INVALID_NATIONAL_CODE" : "INVALID_PASSPORT_NUMBER");
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
        nationality,
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

      if (identifierNumber) {
        await this.patientIdentifiers.create(
          PatientIdentifier.create({
            id: asUuid(randomUUID()),
            patientId,
            identifierType: nationality === "iranian" ? "national_code" : "passport",
            rawValue: identifierNumber,
            createdBy: command.actorUserId,
            now,
          }),
          tx,
        );
      }

      const address = PatientAddress.create({
        id: asUuid(randomUUID()),
        patientId,
        province: command.province,
        city: command.city,
        district: command.district,
        addressLine1: command.addressLine1,
        addressLine2: command.addressLine2,
        postalCode: command.postalCode,
        deliveryNotes: command.deliveryNotes,
        createdBy: command.actorUserId,
        now,
      });
      if (!address.isEmpty) {
        await this.patientAddresses.create(address, tx);
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
