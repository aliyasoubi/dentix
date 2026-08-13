import { Component, inject, signal, viewChild } from "@angular/core";
import { ApiErrorMessageService } from "../../core/errors/api-error-message.service";
import { TranslationService } from "../../core/i18n/translation.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { DsPageHeaderComponent } from "../../design-system/product/page-header/ds-page-header.component";
import { PatientRegistrationFormComponent } from "./patient-registration-form/patient-registration-form.component";
import { PatientSearchComponent } from "./patient-search/patient-search.component";
import { CreatePatientRequest, PatientSearchResult, PatientsApiService } from "./patients-api.service";

/**
 * Codes this page has written copy for. Anything else falls back to the
 * generic message rather than rendering a raw identifier at the user —
 * see ApiErrorMessageService.
 */
const KNOWN_ERROR_CODES = new Set([
  "NATIVE_NAME_REQUIRED",
  "INVALID_PHONE",
  "CONTACT_REQUIRED",
  "INVALID_DATE_OF_BIRTH",
  // Returned by the API's global ValidationPipe for a body that is the wrong
  // shape. With the form's own validators, a user working through the UI
  // should never see it — it means something bypassed the form.
  "VALIDATION_FAILED",
]);

/**
 * Composition root for the patients screen.
 *
 * Holds no markup of its own beyond layout: per UX-DS-001 §25 "feature pages
 * compose these components". What it does own is everything the two child
 * components deliberately do not — the API calls, the request/refresh
 * ordering, and turning failures into localized text.
 */
@Component({
  selector: "app-patients-page",
  imports: [DsPageHeaderComponent, PatientRegistrationFormComponent, PatientSearchComponent, TranslatePipe],
  templateUrl: "./patients-page.html",
  styleUrl: "./patients-page.scss",
})
export class PatientsPage {
  private readonly api = inject(PatientsApiService);
  private readonly translation = inject(TranslationService);
  private readonly errorMessages = inject(ApiErrorMessageService);

  /** Needed to clear the form after a *successful* create — see the component's own reset() note. */
  private readonly registrationForm = viewChild.required(PatientRegistrationFormComponent);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly searchQuery = signal("");
  protected readonly searching = signal(false);
  protected readonly results = signal<readonly PatientSearchResult[]>([]);
  protected readonly hasSearched = signal(false);
  /** A failed search must say so rather than leaving the previous list on screen looking current. */
  protected readonly searchError = signal<string | null>(null);

  constructor() {
    void this.runSearch("");
  }

  protected async create(request: CreatePatientRequest): Promise<void> {
    this.submitting.set(true);
    this.submitError.set(null);
    this.successMessage.set(null);

    try {
      const created = await this.api.create(request);
      this.successMessage.set(
        this.translation.translate("patients.form.success", {
          name: request.nativeName,
          patientNumber: created.patientNumber.toString(),
        }),
      );
      this.registrationForm().reset();
    } catch (error) {
      this.submitError.set(this.describe(error));
      return;
    } finally {
      this.submitting.set(false);
    }

    // Deliberately outside the try above. The patient is already created and
    // committed at this point; refreshing the list is a separate, best-effort
    // read. When this was inside the try, a failing refresh surfaced as a
    // *creation* error — so the user would retry a create that had actually
    // succeeded and end up with a duplicate patient record.
    await this.runSearch(this.searchQuery());
  }

  protected async onQueryChange(value: string): Promise<void> {
    this.searchQuery.set(value);
    await this.runSearch(value);
  }

  private async runSearch(query: string): Promise<void> {
    this.searching.set(true);
    this.searchError.set(null);
    try {
      this.results.set(await this.api.search(query));
    } catch (error) {
      // Previously try/finally with no catch: the stale list stayed on screen
      // looking current, and the constructor/keystroke callers turned the
      // rejection into an unhandled promise rejection.
      this.results.set([]);
      this.searchError.set(this.describe(error));
    } finally {
      this.searching.set(false);
      this.hasSearched.set(true);
    }
  }

  private describe(error: unknown): string {
    return this.errorMessages.describe(error, {
      knownCodes: KNOWN_ERROR_CODES,
      keyPrefix: "patients.form.error.",
    });
  }
}
