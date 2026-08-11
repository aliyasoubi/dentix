import { ApiProperty } from "@nestjs/swagger";

export class CreatePatientResponseDto {
  @ApiProperty({ format: "uuid" })
  readonly id!: string;

  @ApiProperty({ description: "Office-scoped sequential patient number." })
  readonly patientNumber!: number;
}
