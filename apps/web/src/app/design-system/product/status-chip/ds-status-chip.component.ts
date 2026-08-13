import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * UX-DS-001 §13's state-family → visual-role mapping. The component takes
 * the resolved visual role directly rather than a domain status string
 * (e.g. "scheduled", "lab_ready") — each feature owns its own status
 * vocabulary and picks the tone; this component only owns how a tone looks.
 */
export type DsStatusChipTone = "neutral" | "neutralSubdued" | "info" | "warning" | "success" | "danger";

/**
 * UX-DS-001 §13: shared status indicator. `label` is mandatory text, never
 * icon-only — "Every chip must include readable text." No icon input yet:
 * nothing in the app consumes one, and the icon asset/loading strategy is
 * a real decision (font vs SVG, Persian-context sizing) this component
 * shouldn't guess at ahead of a real need.
 */
@Component({
  selector: "app-ds-status-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <span class="ds-status-chip" [class]="'ds-status-chip--' + tone()">{{ label() }}</span> `,
  styleUrl: "./ds-status-chip.component.scss",
})
export class DsStatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input.required<DsStatusChipTone>();
}
