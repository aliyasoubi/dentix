import { TransactionContext, Uuid } from "@dentix/kernel";
import { Patient, PatientNationality, PatientSex, PatientStatus } from "../entities/patient.entity";

/** Flat read shape for list/search — not the full aggregate, just what a result row needs. */
export interface PatientSearchResult {
  readonly id: Uuid;
  readonly patientNumber: number;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
  /** Canonical Gregorian ISO date string ("YYYY-MM-DD"), or null — where known (01-patient-management.md). */
  readonly dateOfBirth: string | null;
}

/**
 * Flat read shape for the patient detail page — like PatientSearchResult,
 * a purpose-built projection across patient/name/contact/identifier/
 * address, not the create-only `Patient` aggregate. `identifierNumber`
 * carries whichever document `nationality` implies (national code for
 * "iranian", passport otherwise) — same convention as
 * CreatePatientCommand.
 */
export interface PatientDetail {
  readonly id: Uuid;
  readonly patientNumber: number;
  readonly status: PatientStatus;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
  readonly contactUnavailable: boolean;
  /** Canonical Gregorian ISO date string ("YYYY-MM-DD"), or null — where known. */
  readonly dateOfBirth: string | null;
  readonly sex: PatientSex;
  readonly nationality: PatientNationality;
  readonly identifierNumber: string | null;
  readonly province: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly postalCode: string | null;
  readonly deliveryNotes: string | null;
  /** Surfaced as the response's `ETag` — required by an eventual PATCH's `If-Match`. */
  readonly version: number;
}

export interface PatientRepository {
  create(patient: Patient, tx?: TransactionContext): Promise<void>;
  /**
   * Atomically allocates the next (office_id, patient_number) — an UPSERT
   * against patient_number_sequence, never read-then-increment, so
   * concurrent creates in the same office can't collide.
   */
  nextPatientNumber(officeId: Uuid, tx?: TransactionContext): Promise<number>;
  findById(id: Uuid): Promise<Patient | null>;
  /**
   * `normalizedQuery` empty returns the most recently created patients
   * (a plain list); non-empty matches against patient_name and
   * patient_contact's normalized values, plus an exact patient_number
   * match when the query parses as one.
   */
  search(params: {
    readonly officeId: Uuid;
    readonly normalizedQuery: string;
    readonly canonicalPhoneQuery: string | null;
    readonly patientNumberQuery: number | null;
    readonly limit: number;
  }): Promise<PatientSearchResult[]>;
  /** Office-scoped by design — a patient ID from another office must resolve to null, never leak existence. */
  findDetailById(officeId: Uuid, id: Uuid): Promise<PatientDetail | null>;
  /**
   * Optimistic-concurrency update of demographic fields only — never
   * `status`, which is a future transition endpoint's job (CLAUDE.md
   * invariant 8: state changes go through explicit transition endpoints,
   * not generic edit). Returns false when `(officeId, id, expectedVersion)`
   * no longer matches any row — the caller is expected to have already
   * confirmed the patient exists via a prior read, so false here means the
   * version was stale, not that the patient vanished.
   */
  updateDemographics(
    params: {
      readonly officeId: Uuid;
      readonly id: Uuid;
      readonly expectedVersion: number;
      readonly dateOfBirth: Date | null;
      readonly sex: PatientSex;
      readonly nationality: PatientNationality;
      readonly contactUnavailable: boolean;
      readonly updatedBy: Uuid;
      readonly now: Date;
    },
    tx?: TransactionContext,
  ): Promise<boolean>;
}

export const PATIENT_REPOSITORY = Symbol("PATIENT_REPOSITORY");
