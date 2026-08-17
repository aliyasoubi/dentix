import { Component, DestroyRef, inject, signal, viewChild } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  switchMap,
  tap,
} from "rxjs";
import { ApiErrorMessageService } from "../../core/errors/api-error-message.service";
import { TranslationService } from "../../core/i18n/translation.service";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { DsPageHeaderComponent } from "../../design-system/product/page-header/ds-page-header.component";
import { DsSectionComponent } from "../../design-system/product/section/ds-section.component";
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
  "INVALID_NATIONAL_CODE",
  "INVALID_PASSPORT_NUMBER",
  // Returned by the API's global ValidationPipe for a body that is the wrong
  // shape. With the form's own validators, a user working through the UI
  // should never see it — it means something bypassed the form.
  "VALIDATION_FAILED",
]);

/** Keeps a rapid typist from firing a request per keystroke without adding noticeable lag to a deliberate search. Exported so the spec doesn't hardcode a second copy of this number. */
export const SEARCH_DEBOUNCE_MS = 300;

type SearchOutcome =
  | { readonly ok: true; readonly results: readonly PatientSearchResult[] }
  | { readonly ok: false; readonly error: unknown };

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
  imports: [
    DsPageHeaderComponent,
    DsSectionComponent,
    PatientRegistrationFormComponent,
    PatientSearchComponent,
    TranslatePipe,
  ],
  templateUrl: "./patients-page.html",
  styleUrl: "./patients-page.scss",
})
export class PatientsPage {
  private readonly api = inject(PatientsApiService);
  private readonly translation = inject(TranslationService);
  private readonly errorMessages = inject(ApiErrorMessageService);
  private readonly destroyRef = inject(DestroyRef);

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

  /**
   * Two sources feed one search pipeline. User keystrokes go through
   * `typedQuery$` — debounced and deduplicated, since a rapid typist
   * shouldn't fire a request per character. Programmatic refreshes (the
   * initial load, and the list refresh after a successful create) go
   * through `refreshQuery$` immediately: they aren't a rapid input stream,
   * so waiting out a debounce window before them would just be a visible
   * delay for no benefit.
   *
   * Both are merged into one switchMap, which is what actually fixes the
   * out-of-order-response bug the previous async/await version had: if a
   * slow request for "زهر" is still in flight when "زهرا" fires, switchMap
   * unsubscribes the stale one — and because PatientsApiService.search()
   * returns the raw HttpClient Observable (not a Promise), that unsubscribe
   * reaches all the way down and aborts the underlying request instead of
   * merely discarding an already-settled value.
   */
  private readonly typedQuery$ = new Subject<string>();
  private readonly refreshQuery$ = new Subject<string>();

  constructor() {
    merge(this.typedQuery$.pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged()), this.refreshQuery$)
      .pipe(
        tap(() => this.searching.set(true)),
        switchMap((query) =>
          this.api.search(query).pipe(
            map((results): SearchOutcome => ({ ok: true, results })),
            catchError((error: unknown) => of<SearchOutcome>({ ok: false, error })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => {
        this.searching.set(false);
        this.hasSearched.set(true);
        if (outcome.ok) {
          this.results.set(outcome.results);
          this.searchError.set(null);
        } else {
          // Previously left the stale list on screen looking current on a
          // search failure; cleared here for the same reason a failed
          // create must not appear to have silently done nothing.
          this.results.set([]);
          this.searchError.set(this.describe(outcome.error));
        }
      });

    this.refreshQuery$.next("");
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
    this.refreshQuery$.next(this.searchQuery());
  }

  protected onQueryChange(value: string): void {
    this.searchQuery.set(value);
    this.typedQuery$.next(value);
  }

  private describe(error: unknown): string {
    return this.errorMessages.describe(error, {
      knownCodes: KNOWN_ERROR_CODES,
      keyPrefix: "patients.form.error.",
    });
  }
}
