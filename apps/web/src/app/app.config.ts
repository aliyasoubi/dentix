import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideRouter } from "@angular/router";
import { apiInterceptor } from "./core/http/api.interceptor";
import { TranslationService } from "./core/i18n/translation.service";
import { provideJalaliDateAdapter } from "./core/jalali/provide-jalali-date-adapter";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAnimationsAsync(),
    provideJalaliDateAdapter(),
    // Translations load before the app renders — fa-IR is the only
    // locale (ADR-012), so there's no later switch to react to, and a
    // render-then-flash-in-Persian-text sequence would just be visible
    // jank for no benefit.
    provideAppInitializer(() => inject(TranslationService).loadNamespaces(["common", "patients"])),
  ],
};
