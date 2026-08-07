import { CookieOptions, Response } from "express";

/**
 * 09-authentication-session-architecture.md, "Session cookie": exact name
 * and attributes are normative, not a style choice. `__Host-` requires
 * Secure + Path=/ + no Domain attribute — the browser enforces this prefix
 * itself, so a misconfigured cookie simply fails to be set rather than
 * silently weakening.
 */
export const SESSION_COOKIE_NAME = "__Host-dentix_session";

/**
 * Deliberately NOT HttpOnly: the SPA reads this once (at login and on
 * whoami-driven refresh) to attach it as the X-CSRF-Token header on unsafe
 * requests. It carries a bearer token, same as the session cookie, so it
 * still gets Secure/SameSite=Lax/Path=1 — only HttpOnly differs, and only
 * because JS reading it is the entire point.
 */
export const CSRF_COOKIE_NAME = "dentix_csrf";

const SESSION_COOKIE_OPTIONS: CookieOptions = {
  secure: true,
  httpOnly: true,
  sameSite: "lax",
  path: "/",
};

const CSRF_COOKIE_OPTIONS: CookieOptions = {
  secure: true,
  httpOnly: false,
  sameSite: "lax",
  path: "/",
};

export function setSessionCookies(
  response: Response,
  params: { readonly sessionToken: string; readonly csrfToken: string; readonly maxAgeMs: number },
): void {
  response.cookie(SESSION_COOKIE_NAME, params.sessionToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: params.maxAgeMs,
  });
  response.cookie(CSRF_COOKIE_NAME, params.csrfToken, {
    ...CSRF_COOKIE_OPTIONS,
    maxAge: params.maxAgeMs,
  });
}

export function clearSessionCookies(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  response.clearCookie(CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS);
}
