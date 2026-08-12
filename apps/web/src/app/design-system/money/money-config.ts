import { InjectionToken } from "@angular/core";
import type { MoneyDisplayUnit } from "@dentix/kernel";

export interface MoneyConfiguration {
  readonly defaultUnit: MoneyDisplayUnit;
}

/**
 * UX-DS-001 §2.1: "An authorized administrator selects the default money
 * unit" via public bootstrap configuration. The real app overrides this
 * token in app.config.ts with BootstrapConfigService's loaded value; this
 * factory default only serves contexts that don't wire that up — isolated
 * component tests and Storybook stories (which already override it
 * per-story, see ds-money-display.stories.ts) — so components never see
 * an unconfigured token.
 */
export const MONEY_CONFIG = new InjectionToken<MoneyConfiguration>("MONEY_CONFIG", {
  factory: () => ({ defaultUnit: "TOMAN" }),
});
