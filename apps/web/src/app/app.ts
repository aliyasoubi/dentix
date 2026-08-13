import { Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/auth/auth.service";
import { TranslatePipe } from "./core/i18n/translate.pipe";
import { DsButtonComponent } from "./design-system/foundation/button/ds-button.component";
import { DsAppShellComponent } from "./design-system/product/app-shell/ds-app-shell.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, DsButtonComponent, DsAppShellComponent, TranslatePipe],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly auth = inject(AuthService);

  protected logout(): void {
    void this.auth.logout();
  }
}
