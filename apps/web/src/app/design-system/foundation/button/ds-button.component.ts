import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { MatButtonAppearance, MatButtonModule } from "@angular/material/button";
import { RouterLink } from "@angular/router";

/** UX-DS-001 §14's action weights. */
export type DsButtonTier = "primary" | "secondary" | "tertiary" | "danger";

/**
 * UX-DS-001 §14's four action tiers, as one named choice.
 *
 * The input is the tier, not a Material appearance, because §14 classifies
 * actions by weight — primary, secondary, tertiary, danger — while Material
 * offers filled/outlined/text. Callers used to pick the Material variant
 * directly, so the mapping from "this is a secondary action" to "therefore
 * outlined" lived in each template and could drift. Restyling a whole tier
 * is now one edit here.
 *
 * `danger` is its own tier rather than a colour any caller can apply: §14
 * requires that an ordinary navigation Cancel must not use danger styling,
 * and a free `color` input is exactly how that rule gets broken by accident.
 *
 * Binds Material 22's unified `matButton` appearance input rather than the
 * older `mat-flat-button`-style attribute directives — those are matched at
 * template-compile time, so an appearance chosen from a signal cannot be
 * expressed with them at all without duplicating the element per tier.
 *
 * Renders an anchor when `routerLink` is set so navigation stays a real
 * link — right-clickable, middle-clickable, announced as a link — instead
 * of a button that moves the router.
 */
@Component({
  selector: "app-ds-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, RouterLink],
  template: `
    @if (routerLink(); as link) {
      <a [matButton]="appearance()" [routerLink]="link" [class]="tierClass()">
        <ng-content />
      </a>
    } @else {
      <button
        [matButton]="appearance()"
        [type]="type()"
        [disabled]="disabled()"
        [class]="tierClass()"
        (click)="pressed.emit()"
      >
        <ng-content />
      </button>
    }
  `,
  styleUrl: "./ds-button.component.scss",
})
export class DsButtonComponent {
  readonly tier = input.required<DsButtonTier>();
  readonly type = input<"button" | "submit">("button");
  readonly disabled = input(false);
  readonly routerLink = input<string | readonly unknown[] | null>(null);

  readonly pressed = output<void>();

  /** Danger shares primary's filled weight; the colour is what separates them (see the SCSS). */
  protected readonly appearance = computed<MatButtonAppearance>(() => {
    switch (this.tier()) {
      case "primary":
      case "danger":
        return "filled";
      case "secondary":
        return "outlined";
      case "tertiary":
        return "text";
    }
  });

  protected readonly tierClass = computed(() => `ds-button ds-button--${this.tier()}`);
}
