import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let redirectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // pushState genuinely updates pathname/search without a real navigation
    // — enough to establish "where the user currently is" for the returnTo
    // assertions below. The actual redirect is asserted via the spy, not by
    // reading window.location back afterward: jsdom in this environment
    // never applies a location.href assignment (it logs "Not implemented:
    // navigation" and leaves the property unchanged), so that would silently
    // test nothing.
    window.history.pushState(null, "", "/patients?x=1");
    redirectSpy = vi.spyOn(
      service as unknown as { redirectTo(url: string): void },
      "redirectTo",
    ) as ReturnType<typeof vi.spyOn>;
    redirectSpy.mockImplementation(() => undefined);
  });

  afterEach(() => {
    httpMock.verify();
    window.history.pushState(null, "", "/");
  });

  it("loadSession populates the session from whoami", async () => {
    const loadPromise = service.loadSession();
    httpMock.expectOne("/api/v1/auth/whoami").flush({
      officeId: "11111111-1111-1111-1111-111111111111",
      displayName: "Dr. Reza",
      permissionVersion: 1,
      authenticatedAt: "2026-08-01T00:00:00Z",
      isRecentlyAuthenticated: true,
    });
    await loadPromise;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.checked()).toBe(true);
  });

  it("loadSession clears the session on a failed whoami", async () => {
    const loadPromise = service.loadSession();
    httpMock
      .expectOne("/api/v1/auth/whoami")
      .flush({ code: "NO_SESSION" }, { status: 401, statusText: "Unauthorized" });
    await loadPromise;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.checked()).toBe(true);
  });

  describe("reauthenticate", () => {
    // The whole reason this is separate from login(): without prompt=login
    // the provider answers from its existing SSO session and returns the
    // same stale auth_time, so a RECENT_AUTHENTICATION_REQUIRED recovery
    // would loop straight back to the same refusal.
    it("asks the provider for a fresh interactive login", () => {
      service.reauthenticate("/office-users");

      const url = redirectSpy.mock.calls[0][0] as string;
      expect(url).toContain("prompt=login");
      expect(url).toContain(`returnTo=${encodeURIComponent("/office-users")}`);
    });

    it("leaves ordinary login() without the prompt, so SSO still works", () => {
      service.login("/patients");
      expect(redirectSpy.mock.calls[0][0] as string).not.toContain("prompt=login");
    });
  });

  describe("markSessionExpired", () => {
    it("clears the session, un-checks it, and redirects to login with the current location as returnTo", () => {
      service.markSessionExpired();

      expect(service.isAuthenticated()).toBe(false);
      // authGuard only re-fetches whoami when checked() is false — without
      // this, a session marked expired mid-page would still be waved
      // through as "already checked" on the way back from login.
      expect(service.checked()).toBe(false);
      expect(redirectSpy).toHaveBeenCalledWith(
        `/api/v1/auth/login?returnTo=${encodeURIComponent("/patients?x=1")}`,
      );
    });
  });

  describe("logout", () => {
    it("follows the provider's end-session URL on success", async () => {
      const logoutPromise = service.logout();
      httpMock
        .expectOne("/api/v1/auth/logout")
        .flush({ providerEndSessionUrl: "http://keycloak.local/logout" });
      await logoutPromise;

      expect(redirectSpy).toHaveBeenCalledWith("http://keycloak.local/logout");
    });

    it("falls back to a local login redirect when the logout call itself fails", async () => {
      const logoutPromise = service.logout();
      httpMock
        .expectOne("/api/v1/auth/logout")
        .flush({ code: "NO_SESSION" }, { status: 401, statusText: "Unauthorized" });
      await logoutPromise;

      expect(service.isAuthenticated()).toBe(false);
      expect(service.checked()).toBe(false);
      expect(redirectSpy).toHaveBeenCalledWith(
        `/api/v1/auth/login?returnTo=${encodeURIComponent("/patients")}`,
      );
    });
  });
});
