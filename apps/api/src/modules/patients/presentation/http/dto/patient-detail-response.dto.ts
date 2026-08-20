import { ApiProperty } from "@nestjs/swagger";
import type {
  PatientNationality,
  PatientPreferredLanguage,
  PatientSex,
  PatientStatus,
} from "../../../domain/entities/patient.entity";

export class PatientDetailResponseDto {
  @ApiProperty({ format: "uuid" })
  readonly id!: string;

  @ApiProperty({ description: "Office-scoped sequential patient number." })
  readonly patientNumber!: number;

  @ApiProperty({ enum: ["active", "inactive", "deceased", "duplicate_candidate", "archived"] })
  readonly status!: PatientStatus;

  @ApiProperty()
  readonly nativeName!: string;

  @ApiProperty({ nullable: true, type: String })
  readonly latinName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly phone!: string | null;

  @ApiProperty()
  readonly contactUnavailable!: boolean;

  @ApiProperty({ nullable: true, type: String })
  readonly email!: string | null;

  @ApiProperty({
    description: "Canonical Gregorian ISO date (YYYY-MM-DD), or null where not recorded.",
    format: "date",
    nullable: true,
    type: String,
  })
  readonly dateOfBirth!: string | null;

  @ApiProperty({ enum: ["male", "female", "unspecified"] })
  readonly sex!: PatientSex;

  @ApiProperty({ enum: ["iranian", "foreign"] })
  readonly nationality!: PatientNationality;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "National code for an iranian patient, passport number for a foreign one — see nationality.",
  })
  readonly identifierNumber!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly province!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly city!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly district!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly addressLine1!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly addressLine2!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly postalCode!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly deliveryNotes!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly occupation!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly referralSource!: string | null;

  @ApiProperty({
    enum: ["fa-IR"],
    description: "No edit control exists for this yet — there is exactly one valid value today.",
  })
  readonly preferredLanguage!: PatientPreferredLanguage;

  @ApiProperty({ description: "Optimistic-concurrency version — also echoed as the response's ETag header." })
  readonly version!: number;
}
