import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { CurrentSession } from "./session.model";

interface LogoutResponse {
  readonly providerEndSessionUrl: string;
}

/**
 * Login/callback/logout's provider redirect are top-level browser
 * navigations, not XHR (09-authentication-session-architecture.md — an
 * OIDC Authorization Code redirect can't be driven through fetch/XHR).
 * whoami is the one thing this service actually calls over HTTP.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentSession = signal<CurrentSession | null>(null);
  private readonly sessionChecked = signal(false);

  readonly session = this.currentSession.asReadonly();
  readonly isAuthenticated = computed(() => this.currentSession() !== null);
  readonly checked = this.sessionChecked.asReadonly();

  async loadSession(): Promise<void> {
    try {
      const session = await firstValueFrom(this.http.get<CurrentSession>("/api/v1/auth/whoami"));
      this.currentSession.set(session);
    } catch {
      this.currentSession.set(null);
    } finally {
      this.sessionChecked.set(true);
    }
  }

  login(returnTo: string): void {
    this.redirectTo(`/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  /**
   * Recovery path for the server's RECENT_AUTHENTICATION_REQUIRED: the
   * session is still valid, so an ordinary login() would be answered from
   * the provider's existing SSO session with the same stale `auth_time` and
   * land the user right back on the same refusal. `prompt=login` is what
   * forces a real interactive re-authentication.
   */
  reauthenticate(returnTo: string): void {
    this.redirectTo(`/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}&prompt=login`);
  }

  /** Isolates the one line that's unit-testable only by mocking, rather than by asserting on a real browser navigation. */
  private redirectTo(url: string): void {
    window.location.href = url;
  }

  /**
   * Called by apiInterceptor when the server rejects a call with 401 — the
   * server-side session expired or was force-revoked while the SPA still
   * believed it was authenticated. Clearing `sessionChecked` matters even
   * though a redirect follows immediately: it's what makes authGuard
   * re-check with a fresh whoami instead of waving a dead session through
   * on the way back, e.g. after the user cancels the provider's login page.
   *
   * Redirects rather than just updating local state: the app shell's
   * logout button only renders `@if (auth.isAuthenticated())`, so once that
   * flips false there is no other visible path back to login — the user
   * would otherwise be stranded on the current page reading an inline error
   * with literally nothing left to click. Reuses `login()`, the same
   * redirect authGuard already performs for "no session", with the current
   * location as returnTo so the user lands back where they were.
   */
  markSessionExpired(): void {
    this.currentSession.set(null);
    this.sessionChecked.set(false);
    this.login(window.location.pathname + window.location.search);
  }

  async logout(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post<LogoutResponse>("/api/v1/auth/logout", {}));
      this.currentSession.set(null);
      this.redirectTo(response.providerEndSessionUrl);
    } catch {
      // A failed logout (typically the session was already gone, so the POST
      // 401s) previously left the user staring at an unchanged screen with no
      // redirect. Locally forgetting the session and heading to login is both
      // the safer outcome and the one the user asked for by clicking Logout.
      this.currentSession.set(null);
      this.sessionChecked.set(false);
      this.login("/patients");
    }
  }
}
