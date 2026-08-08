import { TransactionContext } from "@dentix/kernel";
import { PatientContact } from "../entities/patient-contact.entity";

export interface PatientContactRepository {
  create(contact: PatientContact, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_CONTACT_REPOSITORY = Symbol("PATIENT_CONTACT_REPOSITORY");
