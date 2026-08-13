import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

/**
 * Route-level convenience only, same as the isOfficeAdmin field it reads —
 * AddOfficeUserUseCase re-checks independently server-side, which is the
 * actual gate. This exists so a non-admin who navigates or deep-links to
 * the add-user page lands somewhere sensible instead of a form that will
 * only ever come back FORBIDDEN.
 *
 * Loads the session itself rather than assuming authGuard already did:
 * guards listed together in one route's canActivate array run concurrently
 * (Angular subscribes to all of them at once and only combines their
 * results in declaration order), so on a cold/direct navigation this guard
 * can run before authGuard's own `await loadSession()` resolves. Mirrors
 * authGuard's own "load if not checked yet" idiom for that reason.
 */
export const officeAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  if (!auth.checked()) {
    await auth.loadSession();
  }
  if (auth.session()?.isOfficeAdmin) {
    return true;
  }
  return inject(Router).createUrlTree(["/patients"]);
};
