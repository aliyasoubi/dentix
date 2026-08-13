import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { DsFieldErrorKeys, fieldErrorKey } from "./ds-field-errors";

/**
 * Date entry, presented in Jalali.
 *
 * There is no `calendar` input and there is not meant to be one: ADR-012
 * makes the UI Jalali-only, and the conversion to a canonical Gregorian
 * value happens at the application boundary, not per field. Which calendar
 * the picker speaks is decided once by the date adapter this component
 * inherits from the app — so a form can never accidentally render one field
 * Gregorian by passing the wrong prop.
 *
 * Same `control`/`errors` contract as the other field components.
 */
@Component({
  selector: "app-ds-date-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, TranslatePipe],
  template: `
    <mat-form-field appearance="outline" class="ds-date-field">
      <mat-label>{{ label() }}</mat-label>
      <input matInput [matDatepicker]="picker" [formControl]="control()" [required]="required()" />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
      @if (errorKey(); as key) {
        <mat-error>{{ key | translate }}</mat-error>
      }
    </mat-form-field>
  `,
  styleUrl: "./ds-date-field.component.scss",
})
export class DsDateFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<Date | null>>();
  readonly errors = input<DsFieldErrorKeys>({});
  readonly required = input(false);

  protected readonly errorKey = fieldErrorKey(this.control, this.errors);
}
