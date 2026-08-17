import { TransactionContext, Uuid } from "@dentix/kernel";
import { PatientAddress } from "../entities/patient-address.entity";

export interface PatientAddressRepository {
  create(address: PatientAddress, tx?: TransactionContext): Promise<void>;
  /**
   * Insert-or-update the patient's one address row — `patient_address` has
   * its own version/updated_at/updated_by columns already shaped for
   * exactly this (see the entity's own comment). `updatedBy`/`now` are
   * separate from `address` because an update must bump those and the
   * version while preserving the row's original created_at/created_by,
   * which `address`'s own (freshly constructed) values are not — `.create()`
   * always stamps a brand-new creation identity, appropriate for the
   * content it validates, not for who is editing it now.
   */
  upsert(
    params: { readonly address: PatientAddress; readonly updatedBy: Uuid; readonly now: Date },
    tx?: TransactionContext,
  ): Promise<void>;
  /** Removes the address row entirely — used when an edit clears every field back to empty. */
  remove(patientId: Uuid, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_ADDRESS_REPOSITORY = Symbol("PATIENT_ADDRESS_REPOSITORY");
