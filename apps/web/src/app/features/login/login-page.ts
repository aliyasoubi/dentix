import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { ActivatedRoute } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { DsAlertComponent } from "../../design-system/foundation/alert/ds-alert.component";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";

const KNOWN_LOGIN_ERROR_CODES = new Set([
  "INVALID_STATE",
  "REQUEST_EXPIRED_OR_USED",
  "PROVIDER_EXCHANGE_FAILED",
  "NO_ACTIVE_ACCOUNT",
  "NO_OFFICE_MEMBERSHIP",
  "AUTHENTICATION_TIME_UNVERIFIED",
]);

/**
 * The real fix for a login-failure redirect loop: AuthController's
 * callback failure path redirects to `${appBaseUrl}/login?error=CODE`,
 * but until this page existed there was no "/login" route — app.routes.ts's
 * wildcard sent it straight back to "patients", whose authGuard
 * immediately redirected to Keycloak again. If Keycloak's own SSO session
 * was still valid it silently re-authenticated, hit the same failure, and
 * looped as fast as the browser could redirect — burning through the auth
 * endpoints' rate limit in well under a second. This page is a real,
 * unguarded route that never auto-redirects; signing in again requires an
 * explicit click, which is what actually breaks the loop.
 */
@Component({
  selector: "app-login-page",
  imports: [MatButtonModule, DsAlertComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./login-page.html",
  styleUrl: "./login-page.scss",
})
export class LoginPage {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly translation = inject(TranslationService);

  protected readonly errorMessageKey = signal<string | null>(null);

  constructor() {
    const code = this.route.snapshot.queryParamMap.get("error");
    if (code) {
      this.errorMessageKey.set(
        KNOWN_LOGIN_ERROR_CODES.has(code) ? `login.error.${code}` : "common.error.generic",
      );
    }
  }

  protected signIn(): void {
    this.auth.login("/patients");
  }
}
