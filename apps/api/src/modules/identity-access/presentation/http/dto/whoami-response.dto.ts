import { ApiProperty } from "@nestjs/swagger";

export class WhoAmIResponseDto {
  @ApiProperty({ format: "uuid" })
  readonly userId!: string;

  @ApiProperty({ format: "uuid" })
  readonly officeId!: string;

  @ApiProperty()
  readonly displayName!: string;

  @ApiProperty({ description: "Bumped when the user's permissions change, so a stale client can detect it." })
  readonly permissionVersion!: number;

  @ApiProperty({
    format: "date-time",
    description: "RFC 3339 instant of the current session's authentication.",
  })
  readonly authenticatedAt!: string;

  @ApiProperty({ description: "Whether authentication happened recently enough for sensitive actions." })
  readonly isRecentlyAuthenticated!: boolean;
}
