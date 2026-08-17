import { Inject, Injectable } from "@nestjs/common";
import { canonicalizeIranianMobile, normalizeDigits, normalizeForSearch, Uuid } from "@dentix/kernel";
import { PATIENT_REPOSITORY } from "../../domain/repositories/patient.repository";
import type { PatientRepository, PatientSearchResult } from "../../domain/repositories/patient.repository";

const DEFAULT_LIMIT = 25;

// Patient numbers are small, office-scoped sequential integers (patient.
// typeorm-repository.ts's patient_number_sequence). Capping candidate length
// at 9 digits keeps every candidate safely under Postgres integer's
// 2,147,483,647 ceiling — binding a larger value to the `$6::integer` search
// parameter would make node-postgres throw "value out of range for type
// integer", turning an ordinary 10/11-digit phone search into a 500. Capping
// here means a full Iranian mobile number is simply never considered a
// patient-number candidate, which also removes any ambiguity between the
// two search paths.
const DIGITS_ONLY = /^\d+$/;
const MAX_PATIENT_NUMBER_DIGITS = 9;

function parsePatientNumberQuery(normalizedDigits: string): number | null {
  if (!DIGITS_ONLY.test(normalizedDigits) || normalizedDigits.length > MAX_PATIENT_NUMBER_DIGITS) {
    return null;
  }
  const value = Number(normalizedDigits);
  return value > 0 ? value : null;
}

export interface SearchPatientsQuery {
  readonly officeId: Uuid;
  readonly query?: string;
  readonly limit?: number;
}

/**
 * Empty query lists the most recently created patients; a non-empty query
 * matches names via normalizeForSearch (Yeh/Kaf + digit + case
 * normalization), the patient's office-visible number when the query is a
 * short all-digit string, and — when the query looks like an Iranian mobile
 * number in any accepted form — the canonical phone value, so 09…, +98…,
 * 0098…, and Persian-digit input all find the same patient
 * (01-patient-management.md's search requirement).
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
      patientNumberQuery: raw ? parsePatientNumberQuery(normalizeDigits(raw)) : null,
      limit: query.limit ?? DEFAULT_LIMIT,
    });
  }
}
