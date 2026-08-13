import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { DsFieldErrorKeys, fieldErrorKey } from "./ds-field-errors";

/** One choice in a `DsSelectFieldComponent`. `label` is a translation key, not prose. */
export interface DsSelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Single-choice select, matching DsTextFieldComponent's contract exactly —
 * same `control` + `errors` inputs, same appearance, same error timing — so
 * that swapping a field's type in a form is a tag change and nothing else.
 *
 * Options carry translation keys rather than display strings: ADR-012 keeps
 * product-authored UI prose in translation resources, so a caller passing
 * literal Farsi here would be putting UI copy back into a component file.
 */
@Component({
  selector: "app-ds-select-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, TranslatePipe],
  template: `
    <mat-form-field appearance="outline" class="ds-select-field">
      <mat-label>{{ label() }}</mat-label>
      <mat-select [formControl]="control()" [required]="required()">
        @for (option of options(); track option.value) {
          <mat-option [value]="option.value">{{ option.label | translate }}</mat-option>
        }
      </mat-select>
      @if (errorKey(); as key) {
        <mat-error>{{ key | translate }}</mat-error>
      }
    </mat-form-field>
  `,
  styleUrl: "./ds-select-field.component.scss",
})
export class DsSelectFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly options = input.required<readonly DsSelectOption[]>();
  readonly errors = input<DsFieldErrorKeys>({});
  readonly required = input(false);

  protected readonly errorKey = fieldErrorKey(this.control, this.errors);
}
