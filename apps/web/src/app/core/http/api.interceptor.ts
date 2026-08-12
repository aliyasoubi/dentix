import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../auth/auth.service";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE_NAME = "dentix_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * whoami is how AuthService *probes* for a session, so a 401 from it is a
 * normal answer ("nobody is logged in"), not an expiry event. Reacting to it
 * would recurse: 401 → markSessionExpired → guard re-checks → whoami → 401.
 * Logout is excluded for the same reason — AuthService.logout() already
 * handles its own failure and redirects.
 */
const SESSION_PROBE_URLS = ["/api/v1/auth/whoami", "/api/v1/auth/logout"];

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = match?.[1];
  return value ? decodeURIComponent(value) : null;
}

/**
 * Same-origin session-cookie auth (09-authentication-session-
 * architecture.md): every API call carries the session cookie, and every
 * unsafe one also carries the CSRF token the backend issued in its own
 * (non-HttpOnly, JS-readable) cookie — CsrfGuard rejects unsafe requests
 * missing it.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith("/api/")) {
    return next(req);
  }

  let outgoing = req.clone({ withCredentials: true });
  if (UNSAFE_METHODS.has(req.method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      outgoing = outgoing.clone({ setHeaders: { [CSRF_HEADER_NAME]: csrfToken } });
    }
  }

  const auth = inject(AuthService);
  return next(outgoing).pipe(
    catchError((error: unknown) => {
      // The server-side session can end (idle timeout, absolute lifetime, an
      // admin force-revoke) while this SPA still thinks it is authenticated.
      // Without this branch the app stayed "logged in", every subsequent call
      // 401'd, and the only way out was a manual reload.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !SESSION_PROBE_URLS.some((url) => req.url.startsWith(url))
      ) {
        auth.markSessionExpired();
      }
      return throwError(() => error);
    }),
  );
};
