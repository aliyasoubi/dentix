import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { components } from "../../core/http/api-types.gen";

/**
 * 08-implementation S8: request/response shapes are the OpenAPI-generated
 * schema types (api-types.gen.ts), not hand-duplicated interfaces that can
 * silently drift from what PatientsController actually accepts/returns —
 * see openapi:check, which fails CI the moment they do.
 */
export type CreatePatientRequest = components["schemas"]["CreatePatientRequestDto"];
export type CreatePatientResponse = components["schemas"]["CreatePatientResponseDto"];
export type PatientSearchResult = components["schemas"]["PatientSearchResultDto"];
export type PatientDetail = components["schemas"]["PatientDetailResponseDto"];
export type UpdatePatientDemographicsRequest = components["schemas"]["UpdatePatientDemographicsRequestDto"];

/** Thin wrapper over PatientsController (apps/api) — no business logic here, that's the backend's job. */
@Injectable({ providedIn: "root" })
export class PatientsApiService {
  private readonly http = inject(HttpClient);

  create(request: CreatePatientRequest): Promise<CreatePatientResponse> {
    return firstValueFrom(this.http.post<CreatePatientResponse>("/api/v1/patients", request));
  }

  // POST with the term in the body, not GET ?query=. A URL carrying a
  // patient's name or mobile number survives in browser history and
  // devtools regardless of what the server itself logs — see
  // SearchPatientsRequestDto's comment.
  //
  // Returns an Observable, not a Promise, unlike create() above: the caller
  // (PatientsPage) runs this through switchMap on every keystroke, and
  // switchMap's unsubscribe from a stale request needs to actually abort the
  // underlying HttpClient call, not just discard an already-settled Promise.
  search(query: string): Observable<PatientSearchResult[]> {
    return this.http.post<PatientSearchResult[]>("/api/v1/patients/search", query ? { query } : {});
  }

  /** `version` on the response body doubles as the future edit's `If-Match` — no need to read the ETag header separately. */
  getById(id: string): Promise<PatientDetail> {
    return firstValueFrom(this.http.get<PatientDetail>(`/api/v1/patients/${id}`));
  }

  /**
   * `expectedVersion` is the `version` last read from getById()'s response —
   * sent as `If-Match` per 05-api-guidelines.md's optimistic-concurrency
   * contract, not in the body. A 412 means someone else changed the record
   * first; the caller is expected to re-fetch and let the user retry.
   */
  updateDemographics(
    id: string,
    request: UpdatePatientDemographicsRequest,
    expectedVersion: number,
  ): Promise<PatientDetail> {
    return firstValueFrom(
      this.http.patch<PatientDetail>(`/api/v1/patients/${id}`, request, {
        headers: { "If-Match": String(expectedVersion) },
      }),
    );
  }
}
