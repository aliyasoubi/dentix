import { TransactionContext } from "@dentix/kernel";
import { PatientName } from "../entities/patient-name.entity";

export interface PatientNameRepository {
  create(name: PatientName, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_NAME_REPOSITORY = Symbol("PATIENT_NAME_REPOSITORY");
