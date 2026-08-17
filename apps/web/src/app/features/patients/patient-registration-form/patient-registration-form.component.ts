import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { DateAdapter } from "@angular/material/core";
import { DsAlertComponent } from "../../../design-system/foundation/alert/ds-alert.component";
import { DsCheckboxFieldComponent } from "../../../design-system/foundation/field/ds-checkbox-field.component";
import { DsDateFieldComponent } from "../../../design-system/foundation/field/ds-date-field.component";
import { DsFieldErrorKeys } from "../../../design-system/foundation/field/ds-field-errors";
import {
  DsSelectFieldComponent,
  DsSelectOption,
} from "../../../design-system/foundation/field/ds-select-field.component";
import { DsTextFieldComponent } from "../../../design-system/foundation/field/ds-text-field.component";
import { DsDisclosureComponent } from "../../../design-system/product/disclosure/ds-disclosure.component";
import { DsSubmitButtonComponent } from "../../../design-system/product/submit-button/ds-submit-button.component";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { CreatePatientRequest } from "../patients-api.service";
import {
  contactRequired,
  identifierNumber,
  iranianMobile,
  requiredNonBlank,
} from "./patient-form.validators";

type PatientNationality = "iranian" | "foreign";

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
    DsTextFieldComponent,
    DsSelectFieldComponent,
    DsDateFieldComponent,
    DsCheckboxFieldComponent,
    DsAlertComponent,
    DsDisclosureComponent,
    DsSubmitButtonComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./patient-registration-form.component.html",
  styleUrl: "./patient-registration-form.component.scss",
})
export class PatientRegistrationFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private readonly destroyRef = inject(DestroyRef);

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
      // Defaults to "iranian" — the predominant case for this office;
      // matches Patient.create()'s own backend default (patient.entity.ts).
      nationality: ["iranian" as PatientNationality],
      // Holds a national code for an iranian patient, a passport number for
      // a foreign one — identifierNumber (patient-form.validators.ts) reads
      // the sibling `nationality` control above to know which.
      identifierNumber: ["", [identifierNumber]],
      province: [""],
      city: [""],
      district: [""],
      addressLine1: [""],
      addressLine2: [""],
      postalCode: [""],
      deliveryNotes: [""],
    },
    { validators: [contactRequired] },
  );

  constructor() {
    // identifierNumber's own validator already reads nationality correctly
    // whenever IT runs — but changing nationality doesn't by itself re-run
    // a sibling control's validators in reactive forms, so a previously
    // valid/invalid identifierNumber would keep showing its stale state
    // until the user next edited it. This keeps the two in sync the moment
    // nationality changes instead.
    this.form.controls.nationality.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.identifierNumber.updateValueAndValidity();
    });
  }

  // Declaration order is display priority — a blank name reports that it is
  // required rather than that it is blank, which are the same failure said
  // two ways.
  protected readonly NATIVE_NAME_ERRORS: DsFieldErrorKeys = {
    required: "patients.form.error.NATIVE_NAME_REQUIRED",
    requiredNonBlank: "patients.form.error.NATIVE_NAME_REQUIRED",
  };

  protected readonly PHONE_ERRORS: DsFieldErrorKeys = {
    iranianMobile: "patients.form.error.INVALID_PHONE",
  };

  protected readonly IDENTIFIER_NUMBER_ERRORS: DsFieldErrorKeys = {
    iranianNationalCode: "patients.form.error.INVALID_NATIONAL_CODE",
    passportNumber: "patients.form.error.INVALID_PASSPORT_NUMBER",
  };

  protected readonly SEX_OPTIONS: readonly DsSelectOption[] = [
    { value: "unspecified", label: "patients.form.sex.unspecified" },
    { value: "male", label: "patients.form.sex.male" },
    { value: "female", label: "patients.form.sex.female" },
  ];

  protected readonly NATIONALITY_OPTIONS: readonly DsSelectOption[] = [
    { value: "iranian", label: "patients.form.nationality.iranian" },
    { value: "foreign", label: "patients.form.nationality.foreign" },
  ];

  /** Drives the identifier field's label/placeholder in the template — "کد ملی" for an iranian patient, "شماره پاسپورت" for a foreign one. */
  protected isForeignNationality(): boolean {
    return this.form.controls.nationality.value === "foreign";
  }

  protected submit(): void {
    if (this.form.invalid) {
      // markAllAsTouched, not a silent return: the group-level contact rule
      // and the untouched required field both stay invisible otherwise, so
      // the button would appear to do nothing.
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
      nationality: value.nationality,
      identifierNumber: value.identifierNumber || null,
      province: value.province || null,
      city: value.city || null,
      district: value.district || null,
      addressLine1: value.addressLine1 || null,
      addressLine2: value.addressLine2 || null,
      postalCode: value.postalCode || null,
      deliveryNotes: value.deliveryNotes || null,
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
      nationality: "iranian",
      identifierNumber: "",
      province: "",
      city: "",
      district: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      deliveryNotes: "",
    });
  }
}
