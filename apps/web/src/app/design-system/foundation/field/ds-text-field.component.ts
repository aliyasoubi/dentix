import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { DsFieldErrorKeys, fieldErrorKey } from "./ds-field-errors";

/**
 * The single-line text field used by every form.
 *
 * Takes the `FormControl` itself rather than implementing
 * ControlValueAccessor. The forms here are typed reactive forms whose
 * validators live beside them (see patient-form.validators.ts), and a CVA
 * would put a second value pipeline between the form and its own control
 * for no gain — this way `form.controls.nativeName` stays exactly what the
 * component renders, so existing form specs keep asserting through the
 * form API and never through this component's internals.
 *
 * Owns the things that were previously re-decided at each of the six call
 * sites: UX-DS-001 §15's outline appearance, where the error text comes
 * from, and when it is allowed to appear.
 *
 * `latin` exists because §2.1 keeps Latin-script values (phone numbers,
 * email, the Latin name field) left-to-right inside an otherwise RTL form.
 * It is a named intent, not a `dir` passthrough, so no caller has to
 * remember that it means both `dir="ltr"` and `text-align: start`.
 */
@Component({
  selector: "app-ds-text-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <mat-form-field appearance="outline" class="ds-text-field" [class.ds-text-field--latin]="latin()">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [formControl]="control()"
        [required]="required()"
        [type]="type()"
        [attr.dir]="latin() ? 'ltr' : null"
        [attr.inputmode]="inputMode()"
        [attr.placeholder]="placeholder()"
      />
      @if (errorKey(); as key) {
        <mat-error>{{ key | translate }}</mat-error>
      }
    </mat-form-field>
  `,
  styleUrl: "./ds-text-field.component.scss",
})
export class DsTextFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  /** Validator-key → translation-key; see DsFieldErrorKeys for why not plain strings. */
  readonly errors = input<DsFieldErrorKeys>({});
  readonly required = input(false);
  readonly type = input<"text" | "email" | "tel">("text");
  readonly latin = input(false);
  readonly inputMode = input<string | null>(null);
  readonly placeholder = input<string | null>(null);

  protected readonly errorKey = fieldErrorKey(this.control, this.errors);
}
