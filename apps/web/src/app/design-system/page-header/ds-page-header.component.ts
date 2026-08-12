import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * UX-DS-001 §11: "Page title / Short contextual description / Primary
 * action" — every major page follows this pattern. The primary action is
 * content-projected (not a typed `@Input`) so callers keep full control
 * over the button itself (label, click handler, disabled state) — this
 * component only owns the layout, never page-specific behavior.
 */
@Component({
  selector: "app-ds-page-header",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ds-page-header">
      <div class="ds-page-header__text">
        <h1 class="ds-page-header__title ds-text-page-title">{{ title() }}</h1>
        @if (description()) {
          <p class="ds-page-header__description ds-text-supporting">{{ description() }}</p>
        }
      </div>
      <div class="ds-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styleUrl: "./ds-page-header.component.scss",
})
export class DsPageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
