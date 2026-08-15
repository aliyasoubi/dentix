import { TransactionContext } from "@dentix/kernel";
import { PatientIdentifier } from "../entities/patient-identifier.entity";

export interface PatientIdentifierRepository {
  create(identifier: PatientIdentifier, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_IDENTIFIER_REPOSITORY = Symbol("PATIENT_IDENTIFIER_REPOSITORY");
