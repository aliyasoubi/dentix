import { Component, inject, signal, viewChild } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { AuthService } from "../../core/auth/auth.service";
import { ApiErrorMessageService, extractApiErrorCode } from "../../core/errors/api-error-message.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";
import { DsPageHeaderComponent } from "../../design-system/product/page-header/ds-page-header.component";
import { AddUserFormComponent } from "./add-user-form/add-user-form.component";
import { AddOfficeUserRequest, OfficeUsersApiService } from "./office-users-api.service";

/** Codes this page has written copy for — see ApiErrorMessageService for why an unlisted code falls back to the generic message instead of rendering a raw identifier. */
const KNOWN_ERROR_CODES = new Set([
  "FORBIDDEN",
  "RECENT_AUTHENTICATION_REQUIRED",
  "INVALID_EMAIL",
  "NOT_FOUND_IN_PROVIDER",
  "PROVIDER_ACCOUNT_DISABLED",
  "ALREADY_LINKED",
  "VALIDATION_FAILED",
]);

/**
 * Composition root for the add-user screen — same shape as PatientsPage:
 * owns the API call and error translation, the form owns its own control
 * and validation. See AddOfficeUserUseCase (apps/api) for what this
 * deliberately is and isn't: it links an identity that must already exist
 * in Keycloak, it never provisions one.
 */
@Component({
  selector: "app-office-users-page",
  imports: [DsPageHeaderComponent, AddUserFormComponent, MatButtonModule, TranslatePipe],
  templateUrl: "./office-users-page.html",
  styleUrl: "./office-users-page.scss",
})
export class OfficeUsersPage {
  private readonly api = inject(OfficeUsersApiService);
  private readonly auth = inject(AuthService);
  private readonly translation = inject(TranslationService);
  private readonly errorMessages = inject(ApiErrorMessageService);

  /** Needed to clear the form after a *successful* add — see the component's own reset() note. */
  private readonly form = viewChild.required(AddUserFormComponent);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  /**
   * Drives the re-authenticate button. Separate from submitError because
   * this failure is the one the user can actually resolve themselves, and
   * the message alone ("sign in again") is useless without something to
   * click — the toolbar's only auth control is Logout.
   */
  protected readonly needsReauthentication = signal(false);

  protected async add(request: AddOfficeUserRequest): Promise<void> {
    this.submitting.set(true);
    this.submitError.set(null);
    this.successMessage.set(null);
    this.needsReauthentication.set(false);

    try {
      await this.api.add(request);
      this.successMessage.set(
        this.translation.translate("officeUsers.form.success", { email: request.email }),
      );
      this.form().reset();
    } catch (error) {
      // Deliberately not a reset(): the typed email is still what the admin
      // wants to submit once they come back authenticated.
      this.needsReauthentication.set(extractApiErrorCode(error) === "RECENT_AUTHENTICATION_REQUIRED");
      this.submitError.set(
        this.errorMessages.describe(error, {
          knownCodes: KNOWN_ERROR_CODES,
          keyPrefix: "officeUsers.form.error.",
        }),
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected reauthenticate(): void {
    this.auth.reauthenticate("/office-users");
  }
}
