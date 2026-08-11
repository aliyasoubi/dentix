import { ApiProperty } from "@nestjs/swagger";

export class PatientSearchResultDto {
  @ApiProperty({ format: "uuid" })
  readonly id!: string;

  @ApiProperty()
  readonly patientNumber!: number;

  @ApiProperty()
  readonly nativeName!: string;

  @ApiProperty({ nullable: true, type: String })
  readonly latinName!: string | null;

  @ApiProperty({ nullable: true, type: String })
  readonly phone!: string | null;

  @ApiProperty({
    description: "Canonical Gregorian ISO date (YYYY-MM-DD), or null where not recorded.",
    format: "date",
    nullable: true,
    type: String,
  })
  readonly dateOfBirth!: string | null;
}
