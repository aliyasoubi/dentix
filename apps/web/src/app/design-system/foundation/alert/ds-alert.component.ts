import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type DsAlertVariant = "danger" | "success";

/**
 * Inline feedback banner — form validation failure, success confirmation.
 *
 * Exists as a component rather than the pair of global CSS classes it
 * replaces because the ARIA role is not a styling choice and must not be
 * left to each caller to remember: a failure has to interrupt a screen
 * reader (`role="alert"`, assertive) while a confirmation must not
 * (`role="status"`, polite). Every previous call site hand-wrote that
 * attribute next to the variant class, so getting the pairing right
 * depended on copying the right line. Here the variant decides it.
 *
 * UX-DS-001 §6.4: "every state must include readable text" — the message is
 * required content, so the banner can never be color-only.
 */
@Component({
  selector: "app-ds-alert",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="ds-alert" [class]="'ds-alert--' + variant()" [attr.role]="role()">
      <ng-content />
    </p>
  `,
  styleUrl: "./ds-alert.component.scss",
})
export class DsAlertComponent {
  readonly variant = input.required<DsAlertVariant>();

  /**
   * Assertive for failures so the user is interrupted before they carry on
   * with a form that did not submit; polite for confirmations so a success
   * message never cuts across whatever is being read.
   */
  protected readonly role = computed(() => (this.variant() === "danger" ? "alert" : "status"));
}
