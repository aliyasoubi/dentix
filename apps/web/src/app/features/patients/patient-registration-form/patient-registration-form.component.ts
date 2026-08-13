import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { DateAdapter } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { CreatePatientRequest } from "../patients-api.service";
import { contactRequired, iranianMobile, requiredNonBlank } from "./patient-form.validators";

/**
 * Patient registration form.
 *
 * Presentational on purpose: it owns its own controls and validation, but not
 * the API call. UX-DS-001 §25 puts business rules "in application/domain
 * services, not visual components", and keeping the HTTP call in the page
 * means this component can be tested by filling controls and reading the
 * emitted value, with no HTTP mock at all.
 *
 * The date conversion is the one piece of translation it does perform, and it
 * belongs here rather than in the page: the Jalali picker's value is a Date
 * owned by this form, and ADR-012 requires it to cross the boundary as a
 * canonical Gregorian ISO string. Doing it at the edge means the value this
 * component emits is already in the API's vocabulary.
 */
@Component({
  selector: "app-patient-registration-form",
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./patient-registration-form.component.html",
  styleUrl: "./patient-registration-form.component.scss",
})
export class PatientRegistrationFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);

  /** Disables submission while the parent's create request is in flight. */
  readonly submitting = input(false);
  /** Already-localized failure text from the parent's create attempt. */
  readonly errorMessage = input<string | null>(null);
  /** Already-localized confirmation text for the most recent successful create. */
  readonly successMessage = input<string | null>(null);

  readonly submitted = output<CreatePatientRequest>();

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      nativeName: ["", [Validators.required, requiredNonBlank]],
      latinName: [""],
      phone: ["", [iranianMobile]],
      // Explicit FormControl, not the nonNullable-group shorthand: unlike
      // every other field, "no date entered" is a real, valid state here
      // (01-patient-management.md: "where known"), not something reset()
      // should paper over with a non-null placeholder.
      dateOfBirth: this.formBuilder.control<Date | null>(null),
      contactUnavailable: [false],
      sex: ["unspecified" as "male" | "female" | "unspecified"],
    },
    { validators: [contactRequired] },
  );

  protected submit(): void {
    if (this.form.invalid) {
      // markAllAsTouched, not a silent return: the group-level contact rule
      // and the untouched required name both stay invisible otherwise, so the
      // button would appear to do nothing.
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      nativeName: value.nativeName,
      latinName: value.latinName || null,
      phone: value.phone || null,
      contactUnavailable: value.contactUnavailable,
      sex: value.sex,
      dateOfBirth:
        value.dateOfBirth && this.dateAdapter.isValid(value.dateOfBirth)
          ? this.dateAdapter.toIso8601(value.dateOfBirth)
          : null,
    });
  }

  /**
   * Clears the form for the next patient. Public because only the parent
   * knows whether the create actually succeeded — resetting on `submitted`
   * would wipe the user's typing on a failed request and force them to
   * retype it all.
   */
  reset(): void {
    this.form.reset({
      nativeName: "",
      latinName: "",
      phone: "",
      dateOfBirth: null,
      contactUnavailable: false,
      sex: "unspecified",
    });
  }
}
