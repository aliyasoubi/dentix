import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { components } from "../../core/http/api-types.gen";

export type AddOfficeUserRequest = components["schemas"]["AddOfficeUserRequestDto"];
export type AddOfficeUserResponse = components["schemas"]["AddOfficeUserResponseDto"];

/** Thin wrapper over OfficeUsersController (apps/api) — no business logic here, same rule as PatientsApiService. */
@Injectable({ providedIn: "root" })
export class OfficeUsersApiService {
  private readonly http = inject(HttpClient);

  add(request: AddOfficeUserRequest): Promise<AddOfficeUserResponse> {
    return firstValueFrom(this.http.post<AddOfficeUserResponse>("/api/v1/office-users", request));
  }
}
