import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

export interface CreatePatientRequest {
  readonly nativeName: string;
  readonly latinName?: string | null;
  readonly phone?: string | null;
  readonly contactUnavailable?: boolean;
  readonly sex?: "male" | "female" | "unspecified";
}

export interface CreatePatientResponse {
  readonly id: string;
  readonly patientNumber: number;
}

export interface PatientSearchResult {
  readonly id: string;
  readonly patientNumber: number;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
}

/** Thin wrapper over PatientsController (apps/api) — no business logic here, that's the backend's job. */
@Injectable({ providedIn: "root" })
export class PatientsApiService {
  private readonly http = inject(HttpClient);

  create(request: CreatePatientRequest): Promise<CreatePatientResponse> {
    return firstValueFrom(this.http.post<CreatePatientResponse>("/api/v1/patients", request));
  }

  search(query: string): Promise<PatientSearchResult[]> {
    return firstValueFrom(
      this.http.get<PatientSearchResult[]>("/api/v1/patients", { params: query ? { query } : {} }),
    );
  }
}
