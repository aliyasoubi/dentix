import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BootstrapConfigResponseDto } from "./platform/dto/bootstrap-config-response.dto";
import { readAppVersion } from "./platform/app-version";

const APP_VERSION = readAppVersion(__dirname);

/**
 * 06-configuration-catalog.md Layer 4: public, unauthenticated, fetched by
 * the Angular shell before it renders (UX-DS-001 §2.1). No SessionGuard —
 * a user who isn't logged in yet still needs locale/dir/money before the
 * login redirect itself can render correctly.
 */
@ApiTags("bootstrap")
@Controller("bootstrap")
export class BootstrapController {
  @Get()
  @ApiOperation({ summary: "Public frontend bootstrap configuration, fetched before shell render" })
  @ApiOkResponse({ type: BootstrapConfigResponseDto })
  get(): BootstrapConfigResponseDto {
    return {
      locale: "fa-IR",
      dir: "rtl",
      calendarDisplay: "JALALI",
      // CLAUDE.md: "Office timezone is explicit Asia/Tehran, never
      // inferred from the browser" — fixed until a real Layer-2 office
      // settings store exists to make this configurable.
      timezone: "Asia/Tehran",
      money: { defaultUnit: "TOMAN", showUnitLabel: true },
      apiBaseUrl: "/api/v1",
      appVersion: APP_VERSION,
    };
  }
}
