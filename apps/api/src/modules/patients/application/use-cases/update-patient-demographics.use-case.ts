import { Inject, Injectable } from "@nestjs/common";
import {
  asUuid,
  canonicalizeEmail,
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
import { PatientNationality, PatientSex } from "../../domain/entities/patient.entity";
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
import { parseDateOfBirth } from "./create-patient.use-case";

export type UpdatePatientDemographicsErrorCode =
  | "PATIENT_NOT_FOUND"
  | "VERSION_CONFLICT"
  | "NATIVE_NAME_REQUIRED"
  | "INVALID_PHONE"
  | "CONTACT_REQUIRED"
  | "INVALID_DATE_OF_BIRTH"
  | "INVALID_NATIONAL_CODE"
  | "INVALID_PASSPORT_NUMBER"
  | "INVALID_EMAIL";

/** Same shape as CreatePatientCommand, plus `expectedVersion` (the client's last-known `version`, from `If-Match`) — see that command's own field comments. Never carries `status`: a state change is a future transition endpoint's job (CLAUDE.md invariant 8), not this one's. */
export interface UpdatePatientDemographicsCommand {
  readonly officeId: Uuid;
  readonly actorUserId: Uuid;
  readonly patientId: Uuid;
  readonly expectedVersion: number;
  readonly nativeName: string;
  readonly latinName?: string | null;
  readonly phone?: string | null;
  readonly contactUnavailable?: boolean;
  readonly sex?: PatientSex;
  readonly dateOfBirth?: string | null;
  readonly nationality?: PatientNationality;
  readonly identifierNumber?: string | null;
  readonly email?: string | null;
  readonly province?: string | null;
  readonly city?: string | null;
  readonly district?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly postalCode?: string | null;
  readonly deliveryNotes?: string | null;
  readonly occupation?: string | null;
  readonly referralSource?: string | null;
}

type TransactionOutcome = { readonly ok: true } | { readonly ok: false; readonly code: "VERSION_CONFLICT" };

/**
 * Release 1's "edit demographics" — the write half of the patient detail
 * page. Validates exactly like CreatePatientUseCase (same rules apply to
 * a correction as to the original entry), then only touches the child
 * rows whose *content* actually changed, comparing against the
 * office-scoped detail this command's caller already fetched a fresh copy
 * of. This keeps patient_name's append-only history meaningful — a save
 * that didn't change the name doesn't manufacture a spurious "renamed"
 * entry — and avoids unconditional writes to rows nothing here altered.
 *
 * `patient.updateDemographics`'s own optimistic-concurrency UPDATE is the
 * first write in the transaction on purpose: if `expectedVersion` is
 * stale, every other write in this use case is skipped, not merely
 * rolled back after being attempted.
 */
@Injectable()
export class UpdatePatientDemographicsUseCase {
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
    command: UpdatePatientDemographicsCommand,
  ): Promise<Result<void, UpdatePatientDemographicsErrorCode>> {
    const current = await this.patients.findDetailById(command.officeId, command.patientId);
    if (!current) {
      return fail("PATIENT_NOT_FOUND");
    }

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

    const email = command.email?.trim() || null;
    if (email && !canonicalizeEmail(email)) {
      return fail("INVALID_EMAIL");
    }

    const now = new Date();
    const changedFields: string[] = [];

    const outcome = await this.unitOfWork.runInTransaction<TransactionOutcome>(async (tx) => {
      const versionOk = await this.patients.updateDemographics(
        {
          officeId: command.officeId,
          id: command.patientId,
          expectedVersion: command.expectedVersion,
          dateOfBirth,
          sex: command.sex ?? "unspecified",
          nationality,
          contactUnavailable: !phone,
          occupation: command.occupation?.trim() || null,
          referralSource: command.referralSource?.trim() || null,
          updatedBy: command.actorUserId,
          now,
        },
        tx,
      );
      if (!versionOk) {
        return { ok: false, code: "VERSION_CONFLICT" };
      }

      if (nativeName !== current.nativeName) {
        changedFields.push("nativeName");
        await this.patientNames.replaceCurrent(
          PatientName.create({
            id: asUuid(randomUUID()),
            patientId: command.patientId,
            nameType: "native",
            value: nativeName,
            createdBy: command.actorUserId,
            now,
          }),
          tx,
        );
      }

      if (latinName !== current.latinName) {
        changedFields.push("latinName");
        if (latinName) {
          await this.patientNames.replaceCurrent(
            PatientName.create({
              id: asUuid(randomUUID()),
              patientId: command.patientId,
              nameType: "latin",
              value: latinName,
              createdBy: command.actorUserId,
              now,
            }),
            tx,
          );
        }
        // A latin name that becomes blank is left as history (the last
        // current row simply stops being superseded) — patient_name has
        // no "no current row" representation to remove it into, and
        // unlike phone this isn't a field the parent row also tracks a
        // presence flag for, so there's no stale-invariant risk in
        // leaving it.
      }

      if (phone !== current.phone) {
        changedFields.push("phone");
        if (phone) {
          await this.patientContacts.upsert(
            PatientContact.create({
              id: asUuid(randomUUID()),
              patientId: command.patientId,
              contactType: "mobile_phone",
              rawValue: phone,
              createdBy: command.actorUserId,
              now,
            }),
            tx,
          );
        } else {
          await this.patientContacts.remove(command.patientId, "mobile_phone", tx);
        }
      }

      if (email !== current.email) {
        changedFields.push("email");
        if (email) {
          await this.patientContacts.upsert(
            PatientContact.create({
              id: asUuid(randomUUID()),
              patientId: command.patientId,
              contactType: "email",
              rawValue: email,
              createdBy: command.actorUserId,
              now,
            }),
            tx,
          );
        } else {
          await this.patientContacts.remove(command.patientId, "email", tx);
        }
      }

      if (identifierNumber !== current.identifierNumber || nationality !== current.nationality) {
        changedFields.push("identifierNumber");
        if (identifierNumber) {
          await this.patientIdentifiers.upsert(
            PatientIdentifier.create({
              id: asUuid(randomUUID()),
              patientId: command.patientId,
              identifierType: nationality === "iranian" ? "national_code" : "passport",
              rawValue: identifierNumber,
              createdBy: command.actorUserId,
              now,
            }),
            tx,
          );
        } else {
          await this.patientIdentifiers.remove(command.patientId, tx);
        }
      }

      const addressChanged =
        (command.province ?? null) !== current.province ||
        (command.city ?? null) !== current.city ||
        (command.district ?? null) !== current.district ||
        (command.addressLine1 ?? null) !== current.addressLine1 ||
        (command.addressLine2 ?? null) !== current.addressLine2 ||
        (command.postalCode ?? null) !== current.postalCode ||
        (command.deliveryNotes ?? null) !== current.deliveryNotes;
      if (addressChanged) {
        changedFields.push("address");
        const address = PatientAddress.create({
          id: asUuid(randomUUID()),
          patientId: command.patientId,
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
        if (address.isEmpty) {
          await this.patientAddresses.remove(command.patientId, tx);
        } else {
          await this.patientAddresses.upsert({ address, updatedBy: command.actorUserId, now }, tx);
        }
      }

      await this.auditEvents.create(
        AuditEvent.create({
          id: asUuid(randomUUID()),
          officeId: command.officeId,
          actorUserId: command.actorUserId,
          action: "patient_demographics_updated",
          entityType: "patient",
          entityId: command.patientId,
          // Field names only, never values — the same PHI-safe convention
          // as CreatePatientUseCase's own audit event.
          detail: changedFields.length > 0 ? `changed: ${changedFields.join(", ")}` : null,
          now,
        }),
        tx,
      );

      return { ok: true };
    });

    if (!outcome.ok) {
      return fail(outcome.code);
    }
    return ok(undefined);
  }
}
