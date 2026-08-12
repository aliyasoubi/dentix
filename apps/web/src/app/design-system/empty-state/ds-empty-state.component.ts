import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * UX-DS-001 §28 required component. Deliberately plain — §3 rules out
 * "a highly decorative consumer application," and §9.1 reserves the large
 * 14px radius for exactly this kind of "large empty state" surface. An
 * optional action is content-projected, same reasoning as DsPageHeader:
 * this component owns layout, never page-specific behavior.
 */
@Component({
  selector: "app-ds-empty-state",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ds-empty-state">
      <p class="ds-empty-state__title ds-text-section-title">{{ title() }}</p>
      @if (description()) {
        <p class="ds-empty-state__description ds-text-supporting">{{ description() }}</p>
      }
      <ng-content />
    </div>
  `,
  styleUrl: "./ds-empty-state.component.scss",
})
export class DsEmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
