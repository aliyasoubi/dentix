import { TransactionContext, Uuid } from "@dentix/kernel";
import { Patient } from "../entities/patient.entity";

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
   * patient_contact's normalized values.
   */
  search(params: {
    readonly officeId: Uuid;
    readonly normalizedQuery: string;
    readonly canonicalPhoneQuery: string | null;
    readonly limit: number;
  }): Promise<PatientSearchResult[]>;
}

export const PATIENT_REPOSITORY = Symbol("PATIENT_REPOSITORY");
