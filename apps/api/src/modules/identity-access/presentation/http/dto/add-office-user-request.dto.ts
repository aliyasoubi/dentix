import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

/**
 * Only an email — this links an identity that must already exist in
 * Keycloak (found by this address), it never provisions one. See
 * AddOfficeUserUseCase's own comment for why: ADR-007/09-authentication-
 * session-architecture.md's "Dentix administrators may link... but never
 * set or view passwords."
 */
export class AddOfficeUserRequestDto {
  @ApiProperty({ description: "Must match an existing, enabled account in the identity provider." })
  @IsEmail()
  readonly email!: string;
}
