import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { PatientSex } from "../../../domain/entities/patient.entity";

const PATIENT_SEX_VALUES: readonly PatientSex[] = ["male", "female", "unspecified"];

/** 05-api-guidelines.md / 02-slices-release-0.5.md S4: native name required, Latin name optional. */
export class CreatePatientRequestDto {
  @ApiProperty({ description: "Patient's name as entered, typically Persian." })
  readonly nativeName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Optional Latin-script name, stored and displayed unmirrored in RTL.",
  })
  readonly latinName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Iranian mobile number in any common display form (09…, +98…, Persian digits).",
  })
  readonly phone?: string | null;

  @ApiPropertyOptional({ description: "True only when the patient explicitly has no contact method." })
  readonly contactUnavailable?: boolean;

  @ApiPropertyOptional({ enum: PATIENT_SEX_VALUES })
  readonly sex?: PatientSex;

  @ApiPropertyOptional({
    type: String,
    description:
      "Canonical Gregorian ISO date (YYYY-MM-DD) — converted from the Jalali picker at the UI boundary (ADR-008/012).",
    format: "date",
    nullable: true,
  })
  readonly dateOfBirth?: string | null;
}
