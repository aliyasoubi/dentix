import { TransactionContext, Uuid } from "@dentix/kernel";
import { PatientContact, PatientContactType } from "../entities/patient-contact.entity";

export interface PatientContactRepository {
  create(contact: PatientContact, tx?: TransactionContext): Promise<void>;
  /**
   * Insert-or-update by `(patientId, contactType)` — unlike patient_name
   * there is no history flag here (01-patient-management.md never asks
   * for "previous phone numbers"), so an edit corrects the existing row
   * in place rather than appending.
   */
  upsert(contact: PatientContact, tx?: TransactionContext): Promise<void>;
  /**
   * Removes the `(patientId, contactType)` row entirely — used when an
   * edit clears a contact value, so a stale row can't keep surfacing a
   * phone number the parent `patient.contactUnavailable` flag says no
   * longer exists.
   */
  remove(patientId: Uuid, contactType: PatientContactType, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_CONTACT_REPOSITORY = Symbol("PATIENT_CONTACT_REPOSITORY");
