import { Component, inject } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { AuthService } from "./core/auth/auth.service";
import { TranslatePipe } from "./core/i18n/translate.pipe";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, TranslatePipe],
  templateUrl: "./app.html",
  styleUrl: "./app.scss",
})
export class App {
  protected readonly auth = inject(AuthService);

  protected logout(): void {
    void this.auth.logout();
  }
}
