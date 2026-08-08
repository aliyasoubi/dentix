import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from "@angular/material/core";
import { JalaliDateAdapter } from "./jalali-date-adapter";
import { JALALI_DATE_FORMATS } from "./jalali-date-formats";

/**
 * ADR-012: the app is Jalali-only, so this replaces Material's date
 * adapter globally — there is no locale switch, unlike
 * provideNativeDateAdapter's usual per-consumer opt-in.
 */
export function provideJalaliDateAdapter(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MAT_DATE_LOCALE, useValue: "fa-IR" },
    { provide: DateAdapter, useClass: JalaliDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: JALALI_DATE_FORMATS },
  ]);
}
