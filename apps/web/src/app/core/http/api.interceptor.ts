import { HttpInterceptorFn } from "@angular/common/http";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE_NAME = "dentix_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

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
  return next(outgoing);
};
