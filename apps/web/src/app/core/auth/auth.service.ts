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
    window.location.href = `/api/v1/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  /**
   * Called by apiInterceptor when the server rejects a call with 401 — the
   * server-side session expired or was force-revoked while the SPA still
   * believed it was authenticated. Clearing `sessionChecked` too is the part
   * that matters: authGuard only re-fetches whoami when it is false, so
   * without this the guard would keep waving through a dead session.
   */
  markSessionExpired(): void {
    this.currentSession.set(null);
    this.sessionChecked.set(false);
  }

  async logout(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.post<LogoutResponse>("/api/v1/auth/logout", {}));
      this.currentSession.set(null);
      window.location.href = response.providerEndSessionUrl;
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
