import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

/**
 * A request body, not a query string. CLAUDE.md: "No PHI or secrets in
 * logs, URLs, commits, or error messages" — a name, mobile number, or
 * national code typed into search is exactly the kind of value that must
 * never end up in a URL, since URLs land in browser history, devtools,
 * and any access log a future reverse proxy or request-logging middleware
 * adds (05-api-guidelines.md's "logs redact query values" carve-out was
 * corrected in the same change this DTO was introduced, since nothing in
 * this codebase implements that redaction and a URL's exposure — browser
 * history, shared-terminal devtools — isn't a logging concern at all).
 */
export class SearchPatientsRequestDto {
  @ApiPropertyOptional({
    type: String,
    description: "Name, mobile number, or patient number fragment; omit to list most recent.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly query?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;
}
