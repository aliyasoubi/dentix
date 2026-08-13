import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter } from "@angular/router";
import { BootstrapConfigService } from "./core/bootstrap/bootstrap-config.service";
import { apiInterceptor } from "./core/http/api.interceptor";
import { TranslationService } from "./core/i18n/translation.service";
import { provideJalaliDateAdapter } from "./core/jalali/provide-jalali-date-adapter";
import { MONEY_CONFIG } from "./design-system/foundation/money/money-config";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAnimationsAsync(),
    provideJalaliDateAdapter(),
    // 06-configuration-catalog.md Layer 4 / UX-DS-001 §2.1: the public
    // bootstrap config loads before the app renders, same reasoning as
    // translations below — validates the fixed locale/dir/calendar and
    // supplies the real MONEY_CONFIG value (see the provider below).
    provideAppInitializer(() => inject(BootstrapConfigService).load()),
    // Translations load before the app renders — fa-IR is the only
    // locale (ADR-012), so there's no later switch to react to, and a
    // render-then-flash-in-Persian-text sequence would just be visible
    // jank for no benefit.
    provideAppInitializer(() => inject(TranslationService).loadNamespaces(["common", "patients", "login"])),
    // Replaces MONEY_CONFIG's placeholder default (see that token's own
    // comment) with the real bootstrap-loaded value — evaluated lazily on
    // first injection, which happens only after the initializer above has
    // already resolved.
    { provide: MONEY_CONFIG, useFactory: () => inject(BootstrapConfigService).moneyConfig },
  ],
};
