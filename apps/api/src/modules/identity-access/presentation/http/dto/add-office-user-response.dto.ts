import { ApiProperty } from "@nestjs/swagger";

export class AddOfficeUserResponseDto {
  @ApiProperty({ format: "uuid" })
  readonly officeUserId!: string;
}
