import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { formatJalali, isoDateToJalali, toPersianDigits } from "@dentix/kernel";
import { ApiErrorMessageService } from "../../../core/errors/api-error-message.service";
import { TranslationService } from "../../../core/i18n/translation.service";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { DsAlertComponent } from "../../../design-system/foundation/alert/ds-alert.component";
import { DsButtonComponent } from "../../../design-system/foundation/button/ds-button.component";
import { DsDetailFieldComponent } from "../../../design-system/foundation/detail-field/ds-detail-field.component";
import { DsPageHeaderComponent } from "../../../design-system/product/page-header/ds-page-header.component";
import { DsSectionComponent } from "../../../design-system/product/section/ds-section.component";
import {
  DsStatusChipComponent,
  DsStatusChipTone,
} from "../../../design-system/product/status-chip/ds-status-chip.component";
import { PatientRegistrationFormComponent } from "../patient-registration-form/patient-registration-form.component";
import { CreatePatientRequest, PatientDetail, PatientsApiService } from "../patients-api.service";

const LOAD_ERROR_CODES = new Set(["PATIENT_NOT_FOUND", "MISSING_PERMISSION"]);

/**
 * Codes UpdatePatientDemographicsUseCase can return. The validation ones
 * already have copy under patients.form.error.* (the create form's own
 * errors) — the same rule failing means the same message, so this reuses
 * that prefix rather than duplicating translations. VERSION_CONFLICT and
 * PATIENT_NOT_FOUND are edit-specific additions to that same set.
 */
const SAVE_ERROR_CODES = new Set([
  "NATIVE_NAME_REQUIRED",
  "INVALID_PHONE",
  "CONTACT_REQUIRED",
  "INVALID_DATE_OF_BIRTH",
  "INVALID_NATIONAL_CODE",
  "INVALID_PASSPORT_NUMBER",
  "VERSION_CONFLICT",
  "PATIENT_NOT_FOUND",
]);

const STATUS_TONE: Record<string, DsStatusChipTone> = {
  active: "success",
  inactive: "neutralSubdued",
  deceased: "neutral",
  duplicate_candidate: "warning",
  archived: "neutralSubdued",
};

/** Table-cell display only, same reasoning as patient-search's own copy of this function (ADR-008's implementation note). */
function formatDateOfBirth(isoDate: string | null): string {
  return isoDate ? toPersianDigits(formatJalali(isoDateToJalali(isoDate))) : "";
}

/**
 * Release 1's "central gap" (release-1-patient-book.md): the screen that
 * lets a receptionist see, and now correct, what's already stored for a
 * patient beyond the search row — status (view-only; a state change is a
 * future transition endpoint's job, not this page's), identifier, address.
 *
 * Edit mode reuses PatientRegistrationFormComponent rather than a second
 * form: the field set and validators are identical to registration's, and
 * a correction should fail the same rules the original entry did.
 */
@Component({
  selector: "app-patient-detail-page",
  imports: [
    DsAlertComponent,
    DsButtonComponent,
    DsDetailFieldComponent,
    DsPageHeaderComponent,
    DsSectionComponent,
    DsStatusChipComponent,
    PatientRegistrationFormComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./patient-detail-page.html",
  styleUrl: "./patient-detail-page.scss",
})
export class PatientDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PatientsApiService);
  private readonly translation = inject(TranslationService);
  private readonly errorMessages = inject(ApiErrorMessageService);

  private readonly patientId = this.route.snapshot.paramMap.get("id");

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly detail = signal<PatientDetail | null>(null);

  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** Only rendered while editing() — the effect below patches it with the current record the moment it exists. */
  private readonly editForm = viewChild(PatientRegistrationFormComponent);

  constructor() {
    if (!this.patientId) {
      this.loading.set(false);
      this.loadError.set(this.translation.translate("patients.detail.error.PATIENT_NOT_FOUND"));
    } else {
      void this.load(this.patientId);
    }

    effect(() => {
      const form = this.editForm();
      const patient = this.detail();
      if (form && patient && this.editing()) {
        form.loadValue(patient);
      }
    });
  }

  protected readonly formatDateOfBirth = formatDateOfBirth;

  protected statusTone(status: string): DsStatusChipTone {
    return STATUS_TONE[status] ?? "neutral";
  }

  protected identifierLabel(): string {
    return this.translation.translate(
      this.detail()?.nationality === "foreign"
        ? "patients.form.identifierNumber.label.passport"
        : "patients.form.identifierNumber.label.nationalCode",
    );
  }

  protected patientNumberDescription(patientNumber: number): string {
    return this.translation.translate("patients.detail.patientNumber", {
      patientNumber: patientNumber.toString(),
    });
  }

  protected startEdit(): void {
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
  }

  protected async save(request: CreatePatientRequest): Promise<void> {
    const patient = this.detail();
    if (!this.patientId || !patient) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const fresh = await this.api.updateDemographics(this.patientId, request, patient.version);
      this.detail.set(fresh);
      this.editing.set(false);
    } catch (error) {
      this.saveError.set(
        this.errorMessages.describe(error, {
          knownCodes: SAVE_ERROR_CODES,
          keyPrefix: "patients.form.error.",
        }),
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.detail.set(await this.api.getById(id));
    } catch (error) {
      this.loadError.set(
        this.errorMessages.describe(error, {
          knownCodes: LOAD_ERROR_CODES,
          keyPrefix: "patients.detail.error.",
        }),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
