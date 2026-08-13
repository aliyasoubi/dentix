import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

/**
 * A search box: a value in, a value out, no form control.
 *
 * Deliberately not a `DsTextFieldComponent` with different inputs. A search
 * box is not a form field — it has no validation, is never submitted, and
 * its value is a query the caller debounces rather than data being
 * collected. Sharing the field components' `control`/`errors` contract here
 * would mean every caller building a FormControl for something that is not
 * part of any form.
 *
 * This is the seam where UX-DS-001 §28's `DsGlobalPatientSearchComponent`
 * grows: that one adds the shell-level shortcut and result overlay on top
 * of this input, rather than replacing it.
 */
@Component({
  selector: "app-ds-search-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="ds-search-field">
      <mat-label>{{ label() }}</mat-label>
      <input matInput type="search" [value]="value()" (input)="valueChange.emit($any($event.target).value)" />
    </mat-form-field>
  `,
  styleUrl: "./ds-search-field.component.scss",
})
export class DsSearchFieldComponent {
  readonly label = input.required<string>();
  readonly value = input("");

  readonly valueChange = output<string>();
}
