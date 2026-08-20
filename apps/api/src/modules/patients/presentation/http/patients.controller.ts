import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  PreconditionFailedException,
  Post,
  Res,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { asUuid } from "@dentix/kernel";
import { CreatePatientUseCase } from "../../application/use-cases/create-patient.use-case";
import { GetPatientDetailUseCase } from "../../application/use-cases/get-patient-detail.use-case";
import { SearchPatientsUseCase } from "../../application/use-cases/search-patients.use-case";
import { UpdatePatientDemographicsUseCase } from "../../application/use-cases/update-patient-demographics.use-case";
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
import { PatientDetailResponseDto } from "./dto/patient-detail-response.dto";
import { PatientSearchResultDto } from "./dto/patient-search-result.dto";
import { SearchPatientsRequestDto } from "./dto/search-patients-request.dto";
import { UpdatePatientDemographicsRequestDto } from "./dto/update-patient-demographics-request.dto";

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
    private readonly getPatientDetail: GetPatientDetailUseCase,
    private readonly updatePatientDemographics: UpdatePatientDemographicsUseCase,
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
      nationality: body.nationality,
      identifierNumber: body.identifierNumber,
      email: body.email,
      province: body.province,
      city: body.city,
      district: body.district,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      postalCode: body.postalCode,
      deliveryNotes: body.deliveryNotes,
      occupation: body.occupation,
      referralSource: body.referralSource,
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

  @Get(":id")
  @RequirePermission("patient.view")
  @ApiOperation({ summary: "Get a single patient's full record" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: "MISSING_PERMISSION — the caller's roles do not grant patient.view.",
  })
  @ApiResponse({
    status: 404,
    type: ErrorResponseDto,
    description: "PATIENT_NOT_FOUND — unknown ID, or the patient belongs to another office.",
  })
  @ApiOkResponse({ type: PatientDetailResponseDto })
  async getById(
    @CurrentSession() session: UserSession,
    @Param("id", ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PatientDetailResponseDto> {
    const result = await this.getPatientDetail.execute({
      officeId: session.officeId,
      patientId: asUuid(id),
    });
    if (!result.ok) {
      throw new NotFoundException(result.code);
    }
    return withVersionETag(result.value, response);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("patient.edit-demographics")
  @ApiOperation({
    summary: "Correct a patient's demographics (never their status — see the transition endpoints)",
  })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiHeader({
    name: "If-Match",
    required: true,
    description: "The `version` last read from GET /patients/:id's ETag.",
  })
  @ApiBody({ type: UpdatePatientDemographicsRequestDto })
  @ApiOkResponse({ type: PatientDetailResponseDto })
  @ApiResponse({
    status: 403,
    type: ErrorResponseDto,
    description: "MISSING_PERMISSION — the caller's roles do not grant patient.edit-demographics.",
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto, description: "PATIENT_NOT_FOUND" })
  @ApiResponse({
    status: 412,
    type: ErrorResponseDto,
    description:
      "MISSING_IF_MATCH or VERSION_CONFLICT — the caller's copy is missing or stale; re-fetch and retry.",
  })
  @ApiResponse({ status: 400, type: ErrorResponseDto, description: "Validation failure, e.g. INVALID_PHONE" })
  async updateDemographics(
    @CurrentSession() session: UserSession,
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("if-match") ifMatch: string | undefined,
    @Body() body: UpdatePatientDemographicsRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PatientDetailResponseDto> {
    const expectedVersion = ifMatch ? Number.parseInt(ifMatch, 10) : NaN;
    if (!Number.isInteger(expectedVersion)) {
      throw new PreconditionFailedException("MISSING_IF_MATCH");
    }

    const patientId = asUuid(id);
    const result = await this.updatePatientDemographics.execute({
      officeId: session.officeId,
      actorUserId: session.userId,
      patientId,
      expectedVersion,
      nativeName: body.nativeName ?? "",
      latinName: body.latinName,
      phone: body.phone,
      contactUnavailable: body.contactUnavailable,
      sex: body.sex,
      dateOfBirth: body.dateOfBirth,
      nationality: body.nationality,
      identifierNumber: body.identifierNumber,
      email: body.email,
      province: body.province,
      city: body.city,
      district: body.district,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      postalCode: body.postalCode,
      deliveryNotes: body.deliveryNotes,
      occupation: body.occupation,
      referralSource: body.referralSource,
    });
    if (!result.ok) {
      if (result.code === "PATIENT_NOT_FOUND") {
        throw new NotFoundException(result.code);
      }
      if (result.code === "VERSION_CONFLICT") {
        throw new PreconditionFailedException(result.code);
      }
      throw new BadRequestException(result.code);
    }

    // The client's whole reason for calling PATCH is to get a fresh,
    // authoritative copy back (including the new `version` for its next
    // edit) without a separate round trip.
    const refreshed = await this.getPatientDetail.execute({ officeId: session.officeId, patientId });
    if (!refreshed.ok) {
      throw new NotFoundException(refreshed.code);
    }
    return withVersionETag(refreshed.value, response);
  }
}

function withVersionETag(detail: PatientDetailResponseDto, response: Response): PatientDetailResponseDto {
  // Lets a later edit send `version` straight back as `If-Match`
  // (05-api-guidelines.md's optimistic-concurrency contract).
  response.setHeader("ETag", String(detail.version));
  return detail;
}
