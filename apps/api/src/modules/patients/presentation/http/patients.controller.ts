import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CreatePatientUseCase } from "../../application/use-cases/create-patient.use-case";
import { SearchPatientsUseCase } from "../../application/use-cases/search-patients.use-case";
import { CurrentSession, CsrfGuard, SessionGuard, UserSession } from "../../../identity-access/public-api";
import { HttpErrorFilter } from "../../../../platform/http-error.filter";
import { ErrorResponseDto } from "../../../../platform/dto/error-response.dto";
import { CreatePatientRequestDto } from "./dto/create-patient-request.dto";
import { CreatePatientResponseDto } from "./dto/create-patient-response.dto";
import { PatientSearchResultDto } from "./dto/patient-search-result.dto";

/**
 * 02-slices-release-0.5.md S4. Every route requires an authenticated
 * session — patient records don't exist without an office context, and
 * office_id always comes from the session, never a client-supplied
 * value (04-data-model.md: "office_id is derived from the authenticated
 * session, never accepted as an unrestricted client value").
 */
@ApiTags("patients")
@ApiCookieAuth()
@Controller("patients")
@UseGuards(SessionGuard)
@UseFilters(HttpErrorFilter)
export class PatientsController {
  constructor(
    private readonly createPatient: CreatePatientUseCase,
    private readonly searchPatients: SearchPatientsUseCase,
  ) {}

  @Post()
  @UseGuards(CsrfGuard)
  @ApiOperation({ summary: "Create a patient" })
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
    });
    if (!result.ok) {
      throw new BadRequestException(result.code);
    }
    return { id: result.value.id, patientNumber: result.value.patientNumber };
  }

  @Get()
  @ApiOperation({ summary: "Search patients by name or phone, or list most recent when query is empty" })
  @ApiQuery({
    name: "query",
    required: false,
    description: "Name or phone fragment; omit to list most recent.",
  })
  @ApiOkResponse({ type: PatientSearchResultDto, isArray: true })
  async list(
    @CurrentSession() session: UserSession,
    @Query("query") query?: string,
  ): Promise<PatientSearchResultDto[]> {
    return this.searchPatients.execute({ officeId: session.officeId, query });
  }
}
