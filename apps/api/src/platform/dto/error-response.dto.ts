import { ApiProperty } from "@nestjs/swagger";

/**
 * Matches HttpErrorFilter's actual output shape — not yet the full
 * {code, messageKey, correlationId, details} envelope in
 * 05-api-guidelines.md; see that filter's comment for why.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: "Stable, locale-neutral error code (05-api-guidelines.md)." })
  readonly code!: string;
}
