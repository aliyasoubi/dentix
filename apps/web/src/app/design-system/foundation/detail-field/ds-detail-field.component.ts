import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * A single label+value row for a read-only record view (the patient detail
 * page's first consumer). `isolateLatin` mirrors DsDataTableColumn's own
 * flag — required for Latin names, phone numbers, and identifiers in this
 * RTL-only UI (ADR-012 / §4), for the same reason: an unisolated Latin run
 * next to Persian text reorders on screen.
 */
@Component({
  selector: "app-ds-detail-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-detail-field">
      <span class="ds-detail-field__label">{{ label() }}</span>
      <span class="ds-detail-field__value" [class.ds-ltr-isolate]="isolateLatin()">{{
        value() || emptyPlaceholder
      }}</span>
    </div>
  `,
  styleUrl: "./ds-detail-field.component.scss",
})
export class DsDetailFieldComponent {
  readonly label = input.required<string>();
  readonly value = input<string | null>(null);
  readonly isolateLatin = input(false);

  protected readonly emptyPlaceholder = "—";
}
