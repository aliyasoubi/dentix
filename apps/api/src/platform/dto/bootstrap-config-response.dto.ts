import { ApiProperty } from "@nestjs/swagger";
import type { MoneyDisplayUnit } from "@dentix/kernel";

class MoneyBootstrapConfigDto {
  @ApiProperty({ enum: ["RIAL", "TOMAN"] })
  readonly defaultUnit!: MoneyDisplayUnit;

  @ApiProperty({ description: "Always true in v1 — the unit label can never be configured away." })
  readonly showUnitLabel!: boolean;
}

/**
 * 06-configuration-catalog.md Layer 4 / UX-DS-001 §2.1: the public,
 * unauthenticated projection fetched before the shell renders. Every
 * value here is currently a fixed constant, not a live read of office
 * configuration — Layer 2 (an office-editable settings store) doesn't
 * exist yet. That's not a shortcut this DTO is hiding: `locale`, `dir`,
 * and `calendarDisplay` are "fixed in v1" by the catalog's own words, and
 * `timezone`/`money.defaultUnit` become real Layer-2 reads the same day an
 * admin settings screen exists to change them — this is the seam that
 * migration happens through, not a redesign.
 */
export class BootstrapConfigResponseDto {
  @ApiProperty({ enum: ["fa-IR"] })
  readonly locale!: "fa-IR";

  @ApiProperty({ enum: ["rtl"] })
  readonly dir!: "rtl";

  @ApiProperty({ enum: ["JALALI"] })
  readonly calendarDisplay!: "JALALI";

  @ApiProperty({ description: "IANA timezone identifier." })
  readonly timezone!: string;

  @ApiProperty({ type: MoneyBootstrapConfigDto })
  readonly money!: MoneyBootstrapConfigDto;

  @ApiProperty({ description: "Same-origin API path prefix; relative, never an absolute host." })
  readonly apiBaseUrl!: string;

  @ApiProperty()
  readonly appVersion!: string;
}
