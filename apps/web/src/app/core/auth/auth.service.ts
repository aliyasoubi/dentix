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

  async logout(): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LogoutResponse>("/api/v1/auth/logout", {}),
    );
    this.currentSession.set(null);
    window.location.href = response.providerEndSessionUrl;
  }
}
