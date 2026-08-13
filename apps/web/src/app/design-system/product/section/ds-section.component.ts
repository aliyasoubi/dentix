import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * A bordered content container with an optional heading — the ordinary
 * grouping box a page is built from.
 *
 * UX-DS-001 §9.2: "Use borders for ordinary containers... Do not wrap every
 * section in a raised card." That rule was being restated in each page's
 * own stylesheet (patients-page.scss and office-users-page.scss had
 * byte-identical border/radius/padding blocks), which is exactly how a
 * design rule drifts: nothing fails when one copy is edited and the other
 * is not.
 *
 * The heading is optional because not every section has one — the patients
 * page's search section gets its title from the search component itself.
 * When omitted, no empty heading element is rendered rather than an empty
 * one being left for CSS to hide.
 */
@Component({
  selector: "app-ds-section",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ds-section">
      @if (heading()) {
        <h2 class="ds-section__heading ds-text-section-title">{{ heading() }}</h2>
      }
      <ng-content />
    </section>
  `,
  styleUrl: "./ds-section.component.scss",
})
export class DsSectionComponent {
  readonly heading = input<string>();
}
