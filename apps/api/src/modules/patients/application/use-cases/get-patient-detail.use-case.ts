import { Inject, Injectable } from "@nestjs/common";
import { fail, ok, Result, Uuid } from "@dentix/kernel";
import { PatientDetail, PATIENT_REPOSITORY } from "../../domain/repositories/patient.repository";
import type { PatientRepository } from "../../domain/repositories/patient.repository";

export type GetPatientDetailErrorCode = "PATIENT_NOT_FOUND";

export interface GetPatientDetailQuery {
  readonly officeId: Uuid;
  readonly patientId: Uuid;
}

/**
 * Read-only — the patient detail page's spine (release-1-patient-book.md's
 * "central gap"). Office-scoped through PatientRepository.findDetailById:
 * a patient ID from another office resolves to PATIENT_NOT_FOUND, the same
 * outcome as an ID that doesn't exist at all, so neither leaks existence
 * (01-product/04-roles-and-permissions.md rule 2).
 */
@Injectable()
export class GetPatientDetailUseCase {
  constructor(@Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository) {}

  async execute(query: GetPatientDetailQuery): Promise<Result<PatientDetail, GetPatientDetailErrorCode>> {
    const detail = await this.patients.findDetailById(query.officeId, query.patientId);
    return detail ? ok(detail) : fail("PATIENT_NOT_FOUND");
  }
}
