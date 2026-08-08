import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth.guard";

export const routes: Routes = [
  {
    path: "patients",
    canActivate: [authGuard],
    loadComponent: () => import("./features/patients/patients-page").then((m) => m.PatientsPage),
  },
  { path: "", pathMatch: "full", redirectTo: "patients" },
  { path: "**", redirectTo: "patients" },
];
