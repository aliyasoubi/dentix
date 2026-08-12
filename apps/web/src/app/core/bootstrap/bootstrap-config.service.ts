import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { components } from "../http/api-types.gen";
import type { MoneyConfiguration } from "../../design-system/money/money-config";

export type BootstrapConfig = components["schemas"]["BootstrapConfigResponseDto"];

const EXPECTED_LOCALE = "fa-IR";
const EXPECTED_DIR = "rtl";
const EXPECTED_CALENDAR_DISPLAY = "JALALI";

/**
 * 06-configuration-catalog.md Layer 4 / UX-DS-001 §2.1: fetched before the
 * shell renders (wired as an APP_INITIALIZER in app.config.ts). Validates
 * the fixed v1 values against what the backend actually returns rather
 * than trusting them blindly — index.html already hardcodes
 * `<html lang="fa-IR" dir="rtl">` statically, so this isn't what sets
 * them; it's the safety net that fails loudly if a future environment
 * mistake ever serves a mismatched config instead of silently rendering
 * the wrong direction or calendar.
 */
@Injectable({ providedIn: "root" })
export class BootstrapConfigService {
  private readonly http = inject(HttpClient);
  private readonly loaded = signal<BootstrapConfig | null>(null);

  readonly config = this.loaded.asReadonly();

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<BootstrapConfig>("/api/v1/bootstrap"));
    if (
      config.locale !== EXPECTED_LOCALE ||
      config.dir !== EXPECTED_DIR ||
      config.calendarDisplay !== EXPECTED_CALENDAR_DISPLAY
    ) {
      throw new Error(
        `Bootstrap config mismatch: expected locale=${EXPECTED_LOCALE} dir=${EXPECTED_DIR} ` +
          `calendarDisplay=${EXPECTED_CALENDAR_DISPLAY}, got locale=${config.locale} dir=${config.dir} ` +
          `calendarDisplay=${config.calendarDisplay}`,
      );
    }
    this.loaded.set(config);
  }

  /** Feeds MONEY_CONFIG's real provider (app.config.ts) — throws if read before load() resolves, matching MONEY_CONFIG's own "no silent wrong default" intent. */
  get moneyConfig(): MoneyConfiguration {
    const config = this.loaded();
    if (!config) {
      throw new Error("BootstrapConfigService.moneyConfig read before load() completed");
    }
    return { defaultUnit: config.money.defaultUnit };
  }
}
