import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn } from "class-validator";
import {
  DEFAULT_ROLE_CODES,
  type DefaultRoleCode,
} from "../../../domain/value-objects/default-role-definitions";

/**
 * An email and a role. No password field — this links an identity that
 * must already exist in Keycloak (found by this address), it never
 * provisions one. See AddOfficeUserUseCase's own comment for why:
 * ADR-007/09-authentication-session-architecture.md's "Dentix
 * administrators may link... but never set or view passwords."
 *
 * `roleCode` is required rather than optional on purpose: a membership
 * with no role resolves to zero effective permissions, so making it
 * optional would just reintroduce the unusable-account bug in a form the
 * caller could opt into.
 */
export class AddOfficeUserRequestDto {
  @ApiProperty({ description: "Must match an existing, enabled account in the identity provider." })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({
    enum: DEFAULT_ROLE_CODES,
    description: "One of the six fixed roles. Custom roles are not supported.",
  })
  @IsIn(DEFAULT_ROLE_CODES as readonly string[])
  readonly roleCode!: DefaultRoleCode;
}
