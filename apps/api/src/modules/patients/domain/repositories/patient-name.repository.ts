import { TransactionContext } from "@dentix/kernel";
import { PatientName } from "../entities/patient-name.entity";

export interface PatientNameRepository {
  create(name: PatientName, tx?: TransactionContext): Promise<void>;
  /**
   * Supersedes the current row for `name`'s (patientId, nameType) — flips
   * its `is_current` to false — then inserts `name` as the new current
   * row, preserving prior names rather than overwriting them
   * (01-patient-management.md: "previous names"). A no-op flip when no
   * current row exists yet (e.g. adding a latin name for the first time)
   * is harmless — the UPDATE simply matches zero rows.
   */
  replaceCurrent(name: PatientName, tx?: TransactionContext): Promise<void>;
}

export const PATIENT_NAME_REPOSITORY = Symbol("PATIENT_NAME_REPOSITORY");
