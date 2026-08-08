import { inject } from "@angular/core";
import { CanActivateFn } from "@angular/router";
import { AuthService } from "./auth.service";

/** Session-cookie auth has no client-readable token to check locally — whoami is the only source of truth. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  if (!auth.checked()) {
    await auth.loadSession();
  }

  if (auth.isAuthenticated()) {
    return true;
  }

  auth.login(state.url);
  return false;
};
