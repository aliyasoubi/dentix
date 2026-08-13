import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

/**
 * The primary submit action of a form, with its in-flight state.
 *
 * UX-DS-001 §14 makes the primary action one filled button per view, and
 * §4.5/§27 require an action to show it is working rather than appearing
 * inert while a request is out. Both forms in the app had reimplemented
 * that identically — same spinner, same 18px diameter, same
 * `submitting || form.invalid` disable rule — which is three chances to
 * drift for zero benefit.
 *
 * `disabled` stays a separate input from `submitting` because they answer
 * different questions: "the form is not valid yet" versus "this request is
 * already in flight". The button is unusable in either case, but a caller
 * that conflated them could not express "valid, and currently submitting"
 * — which is precisely when the spinner needs to show.
 */
@Component({
  selector: "app-ds-submit-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  template: `
    <button
      mat-flat-button
      color="primary"
      type="submit"
      [disabled]="submitting() || disabled()"
      [attr.aria-busy]="submitting()"
    >
      @if (submitting()) {
        <mat-progress-spinner diameter="18" mode="indeterminate" />
      } @else {
        {{ label() }}
      }
    </button>
  `,
  styleUrl: "./ds-submit-button.component.scss",
})
export class DsSubmitButtonComponent {
  readonly label = input.required<string>();
  readonly submitting = input(false);
  readonly disabled = input(false);
}
