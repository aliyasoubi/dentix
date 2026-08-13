import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { DsAlertComponent } from "../../../design-system/foundation/alert/ds-alert.component";
import { DsFieldErrorKeys } from "../../../design-system/foundation/field/ds-field-errors";
import { DsTextFieldComponent } from "../../../design-system/foundation/field/ds-text-field.component";
import { DsSubmitButtonComponent } from "../../../design-system/product/submit-button/ds-submit-button.component";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { AddOfficeUserRequest } from "../office-users-api.service";

/**
 * Presentational, same shape as PatientRegistrationFormComponent: owns its
 * own control and validation, not the API call — see that component's own
 * comment for why (testable by filling the control and reading the emitted
 * value, no HTTP mock needed).
 *
 * Angular's built-in Validators.email is enough here, unlike the patient
 * form's phone field — there's no equivalent "must match what the backend
 * canonicalizes" concern, since AddOfficeUserUseCase's own email check
 * (SIMPLE_EMAIL) is only ever reached after this form's validator has
 * already passed, not a second independent rule the two could disagree on.
 */
@Component({
  selector: "app-add-user-form",
  imports: [
    ReactiveFormsModule,
    DsTextFieldComponent,
    DsAlertComponent,
    DsSubmitButtonComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./add-user-form.component.html",
  styleUrl: "./add-user-form.component.scss",
})
export class AddUserFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly submitting = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly successMessage = input<string | null>(null);

  readonly submitted = output<AddOfficeUserRequest>();

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
  });

  /**
   * Declaration order is the display priority: an empty field should say it
   * is required, not that it is a malformed address.
   */
  protected readonly EMAIL_ERRORS: DsFieldErrorKeys = {
    required: "officeUsers.form.error.EMAIL_REQUIRED",
    email: "officeUsers.form.error.INVALID_EMAIL",
  };

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // No .trim() here: Validators.email already rejects a value with
    // leading/trailing whitespace (verified — form.invalid is true for one),
    // so by the time this line runs the value can't contain any to trim.
    this.submitted.emit({ email: this.form.getRawValue().email });
  }

  /** Public, parent-driven — same reasoning as PatientRegistrationFormComponent.reset(): only the parent knows the add actually succeeded. */
  reset(): void {
    this.form.reset({ email: "" });
  }
}
