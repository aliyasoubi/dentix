import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MatToolbarModule } from "@angular/material/toolbar";

/**
 * The application frame: brand, navigation, session actions, page content.
 * UX-DS-001 §28's first component, and §10's shell.
 *
 * Built to the shell that exists rather than to §10.2's full diagram. That
 * diagram shows a seven-destination sidebar (Dashboard, Patients, Schedule,
 * Follow-up, Payments, Reports, Admin) — the target once those pages exist.
 * Two of them do. Building the sidebar now would mean shipping navigation
 * to pages that aren't built, which `07-plans/00-build-sequencing.md`
 * exists to prevent. The nav is a projection slot, so growing into the
 * sidebar later is a change inside this component, not across every page.
 *
 * Navigation and session actions are projected, not typed inputs: which
 * links exist depends on who is signed in, and that is application state
 * the design system must not reach for (§25: "business rules remain in
 * application/domain services, not visual components").
 *
 * The brand title is passed in already translated rather than as a key —
 * ADR-012 keeps UI prose in translation resources, so a component that
 * looked up its own key would be holding a string it should not own.
 */
@Component({
  selector: "app-ds-app-shell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatToolbarModule],
  template: `
    <mat-toolbar class="ds-app-shell__bar">
      <img class="ds-app-shell__logo" [src]="logoSrc()" alt="" width="24" height="24" />
      <span class="ds-app-shell__title">{{ brandTitle() }}</span>

      <nav class="ds-app-shell__nav">
        <ng-content select="[dsAppShellNav]" />
      </nav>

      <span class="ds-app-shell__spacer"></span>

      <div class="ds-app-shell__actions">
        <ng-content select="[dsAppShellActions]" />
      </div>
    </mat-toolbar>

    <main class="ds-app-shell__main">
      <ng-content />
    </main>
  `,
  styleUrl: "./ds-app-shell.component.scss",
})
export class DsAppShellComponent {
  readonly brandTitle = input.required<string>();
  /** Decorative — the title beside it already names the product, so the img carries an empty alt. */
  readonly logoSrc = input("/brand/dentix-icon.svg");
}
