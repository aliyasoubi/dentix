import { InjectionToken } from "@angular/core";
import type { MoneyDisplayUnit } from "@dentix/kernel";

export interface MoneyConfiguration {
  readonly defaultUnit: MoneyDisplayUnit;
}

/**
 * UX-DS-001 §2.1: "An authorized administrator selects the default money
 * unit" via public bootstrap configuration — that loader doesn't exist
 * yet (a separate, not-yet-built walking-skeleton item), so this token's
 * default stands in for it until then. Components read this token rather
 * than hardcoding a unit so wiring the real config later is a one-line
 * provider change, not a component rewrite.
 */
export const MONEY_CONFIG = new InjectionToken<MoneyConfiguration>("MONEY_CONFIG", {
  factory: () => ({ defaultUnit: "TOMAN" }),
});
