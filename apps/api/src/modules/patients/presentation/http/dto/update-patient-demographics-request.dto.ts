import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import type { PatientNationality, PatientSex } from "../../../domain/entities/patient.entity";

const PATIENT_SEX_VALUES: readonly PatientSex[] = ["male", "female", "unspecified"];
const PATIENT_NATIONALITY_VALUES: readonly PatientNationality[] = ["iranian", "foreign"];

/**
 * Same field set and the same type-level-only validation split as
 * CreatePatientRequestDto (see that DTO's own comment) — a correction
 * goes through exactly the same domain rules as the original entry.
 * `expectedVersion` is deliberately not a body field: it travels as the
 * `If-Match` header per 05-api-guidelines.md's optimistic-concurrency
 * contract, read directly by the controller.
 */
export class UpdatePatientDemographicsRequestDto {
  @ApiProperty({ description: "Patient's name as entered, typically Persian." })
  @IsString()
  @MaxLength(200)
  readonly nativeName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Optional Latin-script name, stored and displayed unmirrored in RTL.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly latinName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Iranian mobile number in any common display form (09…, +98…, Persian digits).",
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  readonly phone?: string | null;

  @ApiPropertyOptional({ description: "True only when the patient explicitly has no contact method." })
  @IsOptional()
  @IsBoolean()
  readonly contactUnavailable?: boolean;

  @ApiPropertyOptional({ enum: PATIENT_SEX_VALUES })
  @IsOptional()
  @IsIn(PATIENT_SEX_VALUES as readonly string[])
  readonly sex?: PatientSex;

  @ApiPropertyOptional({
    type: String,
    description:
      "Canonical Gregorian ISO date (YYYY-MM-DD) — converted from the Jalali picker at the UI boundary.",
    format: "date",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  readonly dateOfBirth?: string | null;

  @ApiPropertyOptional({
    enum: PATIENT_NATIONALITY_VALUES,
    default: "iranian",
    description: "Determines whether identifierNumber is validated as a national code or a passport number.",
  })
  @IsOptional()
  @IsIn(PATIENT_NATIONALITY_VALUES as readonly string[])
  readonly nationality?: PatientNationality;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "National code (کد ملی) for an iranian patient, or a passport number for a foreign one.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  readonly identifierNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: province." })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly province?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: city." })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: district/locality." })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly district?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: street/address line 1." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly addressLine1?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: street/address line 2." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly addressLine2?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: postal code." })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly postalCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: free-form delivery notes." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly deliveryNotes?: string | null;
}
