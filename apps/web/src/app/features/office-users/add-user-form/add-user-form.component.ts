import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { DsAlertComponent } from "../../../design-system/foundation/alert/ds-alert.component";
import { DsFieldErrorKeys } from "../../../design-system/foundation/field/ds-field-errors";
import {
  DsSelectFieldComponent,
  DsSelectOption,
} from "../../../design-system/foundation/field/ds-select-field.component";
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
    DsSelectFieldComponent,
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
    // Deliberately unselected. This previously defaulted to `cashier`, on the
    // stated grounds that it was "the least-privileged of the six" — which is
    // simply false: cashier carries ledger.refund, ledger.discount and
    // ledger.day-end-close, none of which receptionist has. An admin who did
    // not touch the dropdown silently created an account that could issue
    // refunds. The six roles are NOT a privilege ladder — they are different
    // jobs — so there is no safe default to pick, and the choice must be made
    // explicitly.
    roleCode: ["" as AddOfficeUserRequest["roleCode"] | "", [Validators.required]],
  });

  /**
   * The six fixed roles (01-product/04-roles-and-permissions.md), ordered by
   * how often an office actually onboards them — NOT by privilege, which does
   * not order linearly (see the roleCode comment above). Cashier and system
   * administrator come last because they are specialist money-handling and
   * operator accounts, not because they are "most powerful".
   * Labels are translation keys — DsSelectFieldComponent resolves them.
   */
  protected readonly ROLE_OPTIONS: readonly DsSelectOption[] = [
    { value: "receptionist", label: "officeUsers.role.receptionist" },
    { value: "dental_assistant", label: "officeUsers.role.dental_assistant" },
    { value: "dentist", label: "officeUsers.role.dentist" },
    { value: "office_manager", label: "officeUsers.role.office_manager" },
    { value: "cashier", label: "officeUsers.role.cashier" },
    { value: "system_administrator", label: "officeUsers.role.system_administrator" },
  ];

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
    const value = this.form.getRawValue();
    if (!value.roleCode) {
      // Unreachable via the UI (Validators.required already failed above), but
      // narrows the "" out of the type rather than casting it away.
      return;
    }
    this.submitted.emit({ email: value.email, roleCode: value.roleCode });
  }

  /** Public, parent-driven — same reasoning as PatientRegistrationFormComponent.reset(): only the parent knows the add actually succeeded. */
  reset(): void {
    this.form.reset({ email: "", roleCode: "" });
  }
}
