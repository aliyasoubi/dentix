import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatCheckboxModule } from "@angular/material/checkbox";

/**
 * A single boolean choice.
 *
 * Deliberately not wrapped in a `mat-form-field`, unlike the other field
 * components: a checkbox carries its own label and Material's form-field
 * chrome (outline, floating label, subscript space) is built for text
 * inputs and misrenders around one. It keeps the same `label` + `control`
 * input names so it still reads as a member of the field family.
 *
 * No `errors` input, because nothing in this app validates a lone boolean:
 * the rules that involve a checkbox here — "a phone number, or an explicit
 * statement that there is none" — are group-level and belong to the form,
 * not the control. Adding a per-field error slot would invite pushing a
 * cross-field rule into the wrong place.
 */
@Component({
  selector: "app-ds-checkbox-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatCheckboxModule],
  template: `<mat-checkbox [formControl]="control()">{{ label() }}</mat-checkbox>`,
})
export class DsCheckboxFieldComponent {
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<boolean>>();
}
