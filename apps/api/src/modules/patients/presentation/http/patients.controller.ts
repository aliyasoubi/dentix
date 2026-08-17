import { BadRequestException, Body, Controller, HttpCode, Post, UseFilters, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreatePatientUseCase } from "../../application/use-cases/create-patient.use-case";
import { SearchPatientsUseCase } from "../../application/use-cases/search-patients.use-case";
import {
  CurrentSession,
  CsrfGuard,
  PermissionGuard,
  RequirePermission,
  SessionGuard,
  UserSession,
} from "../../../identity-access/public-api";
import { HttpErrorFilter } from "../../../../platform/http-error.filter";
import { ErrorResponseDto } from "../../../../platform/dto/error-response.dto";
import { CreatePatientRequestDto } from "./dto/create-patient-request.dto";
import { CreatePatientResponseDto } from "./dto/create-patient-response.dto";
import { PatientSearchResultDto } from "./dto/patient-search-result.dto";
import { SearchPatientsRequestDto } from "./dto/search-patients-request.dto";

/**
 * 02-slices-release-0.5.md S4. Every route requires an authenticated
 * session — patient records don't exist without an office context, and
 * office_id always comes from the session, never a client-supplied
 * value (04-data-model.md: "office_id is derived from the authenticated
 * session, never accepted as an unrestricted client value").
 *
 * Guard order matters: SessionGuard populates `request.currentSession`,
 * which PermissionGuard then reads (see that guard's own comment). Until
 * PermissionGuard was applied here these routes were authenticated but
 * NOT authorized — any active office member could read or create patient
 * records regardless of role, which CLAUDE.md invariant 7 ("endpoint AND
 * object-level checks on every mutation") forbids. The permission codes
 * had existed since the RBAC build; nothing was enforcing them.
 */
@ApiTags("patients")
@ApiCookieAuth()
@Controller("patients")
@UseGuards(SessionGuard, PermissionGuard)
@UseFilters(HttpErrorFilter)
export class PatientsController {
  constructor(
    private readonly createPatient: CreatePatientUseCase,
    private readonly searchPatients: SearchPatientsUseCase,
  ) {}

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("patient.create")
  @ApiOperation({ summary: "Create a patient" })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: "MISSING_PERMISSION — the caller's roles do not grant patient.create.",
  })
  @ApiBody({ type: CreatePatientRequestDto })
  @ApiResponse({ status: 201, type: CreatePatientResponseDto })
  @ApiResponse({
    status: 400,
    type: ErrorResponseDto,
    description: "Validation failure, e.g. NATIVE_NAME_REQUIRED",
  })
  async create(
    @CurrentSession() session: UserSession,
    @Body() body: CreatePatientRequestDto,
  ): Promise<CreatePatientResponseDto> {
    const result = await this.createPatient.execute({
      officeId: session.officeId,
      actorUserId: session.userId,
      nativeName: body.nativeName ?? "",
      latinName: body.latinName,
      phone: body.phone,
      contactUnavailable: body.contactUnavailable,
      sex: body.sex,
      dateOfBirth: body.dateOfBirth,
      nationalCode: body.nationalCode,
      province: body.province,
      city: body.city,
      district: body.district,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      postalCode: body.postalCode,
      deliveryNotes: body.deliveryNotes,
    });
    if (!result.ok) {
      throw new BadRequestException(result.code);
    }
    return { id: result.value.id, patientNumber: result.value.patientNumber };
  }

  // POST, not GET: 01-patient-management.md's search terms are names,
  // mobile numbers, and national codes — a query string puts that directly
  // in the URL, which survives in browser history and any devtools/proxy
  // log regardless of what the server itself logs. See the DTO's comment.
  @Post("search")
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  @RequirePermission("patient.view")
  @ApiOperation({
    summary: "Search patients by name, phone, or patient number, or list most recent when query is empty",
  })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: "MISSING_PERMISSION — the caller's roles do not grant patient.view.",
  })
  @ApiBody({ type: SearchPatientsRequestDto })
  @ApiOkResponse({ type: PatientSearchResultDto, isArray: true })
  async search(
    @CurrentSession() session: UserSession,
    @Body() body: SearchPatientsRequestDto,
  ): Promise<PatientSearchResultDto[]> {
    return this.searchPatients.execute({
      officeId: session.officeId,
      query: body.query,
      limit: body.limit,
    });
  }
}
