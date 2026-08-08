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
import { PatientSex } from "../../domain/entities/patient.entity";
import { CreatePatientUseCase } from "../../application/use-cases/create-patient.use-case";
import { SearchPatientsUseCase } from "../../application/use-cases/search-patients.use-case";
import { CurrentSession, CsrfGuard, SessionGuard, UserSession } from "../../../identity-access/public-api";
import { HttpErrorFilter } from "../../../../platform/http-error.filter";

interface CreatePatientRequestBody {
  readonly nativeName: string;
  readonly latinName?: string | null;
  readonly phone?: string | null;
  readonly contactUnavailable?: boolean;
  readonly sex?: PatientSex;
  readonly dateOfBirth?: string | null;
}

/**
 * 02-slices-release-0.5.md S4. Every route requires an authenticated
 * session — patient records don't exist without an office context, and
 * office_id always comes from the session, never a client-supplied
 * value (04-data-model.md: "office_id is derived from the authenticated
 * session, never accepted as an unrestricted client value").
 */
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
  async create(@CurrentSession() session: UserSession, @Body() body: CreatePatientRequestBody) {
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
  async list(@CurrentSession() session: UserSession, @Query("query") query?: string) {
    return this.searchPatients.execute({ officeId: session.officeId, query });
  }
}
