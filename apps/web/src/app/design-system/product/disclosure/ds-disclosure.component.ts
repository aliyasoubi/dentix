import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatExpansionModule } from "@angular/material/expansion";

/**
 * A titled section the user can collapse — used to keep optional detail out
 * of the way without hiding that it exists (UX-DS-001 §4.6: optimize for
 * workflow speed; the common path should not be padded with fields most
 * entries leave blank).
 *
 * Closed by default, and intentionally offers no way to force it open from
 * outside. Anything that must be seen or filled belongs above the fold, not
 * behind a panel a caller has to remember to expand — so a caller wanting
 * `[expanded]="true"` is a signal that the field is in the wrong place, not
 * that this component is missing an input.
 */
@Component({
  selector: "app-ds-disclosure",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatExpansionModule],
  template: `
    <mat-expansion-panel class="ds-disclosure">
      <mat-expansion-panel-header>
        <mat-panel-title>{{ title() }}</mat-panel-title>
      </mat-expansion-panel-header>
      <ng-content />
    </mat-expansion-panel>
  `,
  styleUrl: "./ds-disclosure.component.scss",
})
export class DsDisclosureComponent {
  readonly title = input.required<string>();
}
