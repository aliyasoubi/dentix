import { TransactionContext, Uuid } from "@dentix/kernel";
import { PatientIdentifier } from "../entities/patient-identifier.entity";

export interface PatientIdentifierRepository {
  create(identifier: PatientIdentifier, tx?: TransactionContext): Promise<void>;
  /**
   * Insert-or-update by `patientId` — no history flag exists here either
   * (unlike patient_name), and Slice A's detail read deliberately assumes
   * at most one row per patient; an edit must correct that one row in
   * place, never append a second. Enforced at this application layer only
   * (04-data-model.md calls identifier uniqueness "policy-controlled" —
   * no DB constraint exists yet), same risk tolerance CreatePatientIdentifier's
   * own migration comment already accepted.
   */
  upsert(identifier: PatientIdentifier, tx?: TransactionContext): Promise<void>;
  /** Removes the patient's identifier row entirely — used when an edit clears it. */
  remove(patientId: Uuid, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_IDENTIFIER_REPOSITORY = Symbol("PATIENT_IDENTIFIER_REPOSITORY");
