import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
import type { PatientSex } from "../../../domain/entities/patient.entity";

const PATIENT_SEX_VALUES: readonly PatientSex[] = ["male", "female", "unspecified"];

/**
 * 05-api-guidelines.md / 02-slices-release-0.5.md S4: native name required,
 * Latin name optional.
 *
 * The validators here are deliberately **type-level only** — they reject a
 * body that is the wrong shape (`phone: 123`, `sex: "banana"`,
 * `contactUnavailable: "no"`), which previously reached the use case and
 * either crashed with a 500 or silently bypassed a business rule. What they
 * intentionally do NOT do is re-implement domain rules: a blank name, an
 * unrecognizable Iranian mobile, a missing contact method, a malformed
 * date, and a checksum-invalid national code all stay the use case's job,
 * so those keep returning their own stable domain codes
 * (NATIVE_NAME_REQUIRED, INVALID_PHONE, CONTACT_REQUIRED,
 * INVALID_DATE_OF_BIRTH, INVALID_NATIONAL_CODE) rather than collapsing
 * into one generic validation error. One rule, one owner.
 */
export class CreatePatientRequestDto {
  @ApiProperty({ description: "Patient's name as entered, typically Persian." })
  @IsString()
  readonly nativeName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Optional Latin-script name, stored and displayed unmirrored in RTL.",
  })
  @IsOptional()
  @IsString()
  readonly latinName?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Iranian mobile number in any common display form (09…, +98…, Persian digits).",
  })
  @IsOptional()
  @IsString()
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
      "Canonical Gregorian ISO date (YYYY-MM-DD) — converted from the Jalali picker at the UI boundary (ADR-008/012).",
    format: "date",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  readonly dateOfBirth?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Iranian national code (کد ملی), only when legally and operationally justified. Optional; never blocks registration when omitted.",
  })
  @IsOptional()
  @IsString()
  readonly nationalCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: province." })
  @IsOptional()
  @IsString()
  readonly province?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: city." })
  @IsOptional()
  @IsString()
  readonly city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: district/locality." })
  @IsOptional()
  @IsString()
  readonly district?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: street/address line 1." })
  @IsOptional()
  @IsString()
  readonly addressLine1?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: street/address line 2." })
  @IsOptional()
  @IsString()
  readonly addressLine2?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: postal code." })
  @IsOptional()
  @IsString()
  readonly postalCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, description: "Address: free-form delivery notes." })
  @IsOptional()
  @IsString()
  readonly deliveryNotes?: string | null;
}
