import { Inject, Injectable } from "@nestjs/common";
import { canonicalizeIranianMobile, normalizeForSearch, Uuid } from "@dentix/kernel";
import { PATIENT_REPOSITORY } from "../../domain/repositories/patient.repository";
import type { PatientRepository, PatientSearchResult } from "../../domain/repositories/patient.repository";

const DEFAULT_LIMIT = 25;

export interface SearchPatientsQuery {
  readonly officeId: Uuid;
  readonly query?: string;
  readonly limit?: number;
}

/**
 * Empty query lists the most recently created patients; a non-empty
 * query matches names via normalizeForSearch (Yeh/Kaf + digit + case
 * normalization) and, when the query itself looks like an Iranian mobile
 * number in any accepted form, also matches on the canonical phone value
 * — so 09…, +98…, 0098…, and Persian-digit input all find the same
 * patient (01-patient-management.md's search requirement).
 */
@Injectable()
export class SearchPatientsUseCase {
  constructor(@Inject(PATIENT_REPOSITORY) private readonly patients: PatientRepository) {}

  async execute(query: SearchPatientsQuery): Promise<PatientSearchResult[]> {
    const raw = query.query?.trim() ?? "";
    return this.patients.search({
      officeId: query.officeId,
      normalizedQuery: raw ? normalizeForSearch(raw) : "",
      canonicalPhoneQuery: raw ? canonicalizeIranianMobile(raw) : null,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
  }
}
