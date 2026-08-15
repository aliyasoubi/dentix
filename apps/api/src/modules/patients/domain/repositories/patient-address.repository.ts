import { TransactionContext } from "@dentix/kernel";
import { PatientAddress } from "../entities/patient-address.entity";

export interface PatientAddressRepository {
  create(address: PatientAddress, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_ADDRESS_REPOSITORY = Symbol("PATIENT_ADDRESS_REPOSITORY");
