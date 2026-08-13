import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";
import { officeAdminGuard } from "./core/auth/office-admin.guard";

export const routes: Routes = [
  {
    // Unguarded on purpose: AuthController's callback failure path
    // redirects here (`${appBaseUrl}/login?error=CODE`) — this route must
    // stay reachable without a session, and must never auto-redirect back
    // into the OIDC flow itself, or a failure loops (see login-page.ts).
    path: "login",
    loadComponent: () => import("./features/login/login-page").then((m) => m.LoginPage),
  },
  {
    path: "patients",
    canActivate: [authGuard],
    loadComponent: () => import("./features/patients/patients-page").then((m) => m.PatientsPage),
  },
  {
    path: "office-users",
    // Order matters: authGuard resolves the session first (loadSession() if
    // not already checked), and officeAdminGuard's isOfficeAdmin read
    // assumes that already happened.
    canActivate: [authGuard, officeAdminGuard],
    loadComponent: () => import("./features/office-users/office-users-page").then((m) => m.OfficeUsersPage),
  },
  { path: "", pathMatch: "full", redirectTo: "patients" },
  { path: "**", redirectTo: "patients" },
];
