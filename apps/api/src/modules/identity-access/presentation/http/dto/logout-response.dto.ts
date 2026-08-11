import { ApiProperty } from "@nestjs/swagger";

export class LogoutResponseDto {
  @ApiProperty({
    description: "Provider end-session URL the browser should follow to also end the Keycloak SSO session.",
    format: "uri",
  })
  readonly providerEndSessionUrl!: string;
}
