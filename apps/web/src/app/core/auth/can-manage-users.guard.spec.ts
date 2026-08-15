import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router, UrlTree } from "@angular/router";
import { AuthService } from "./auth.service";
import { canManageUsersGuard } from "./can-manage-users.guard";

describe("canManageUsersGuard", () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    authService = TestBed.inject(AuthService);
    // Default: session already resolved, matching the warm-navigation case —
    // the dedicated test below covers the cold/deep-link case separately.
    Object.defineProperty(authService, "checked", { value: () => true });
  });

  async function runGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      canManageUsersGuard({} as never, { url: "/office-users" } as never),
    ) as Promise<boolean | UrlTree>;
  }

  it("allows a user who can manage users through", async () => {
    Object.defineProperty(authService, "session", {
      value: () => ({ canManageUsers: true }),
    });
    expect(await runGuard()).toBe(true);
  });

  it("redirects a user without the permission to /patients rather than throwing or looping", async () => {
    Object.defineProperty(authService, "session", {
      value: () => ({ canManageUsers: false }),
    });

    const result = await runGuard();

    expect(result).not.toBe(true);
    const tree = result as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(tree)).toBe("/patients");
  });

  it("redirects when there is no session at all (defensive — authGuard should have already caught this)", async () => {
    Object.defineProperty(authService, "session", { value: () => null });

    const result = await runGuard();

    expect(result).not.toBe(true);
  });

  // Regression test: canActivate: [authGuard, canManageUsersGuard] runs both
  // guards concurrently, not in sequence — a cold/direct navigation to
  // /office-users used to reach this guard while auth.session() was still
  // null, bouncing an eligible user to /patients. See the guard's own comment.
  it("loads the session itself when it runs before authGuard's check has resolved", async () => {
    Object.defineProperty(authService, "checked", { value: () => false });
    Object.defineProperty(authService, "session", { value: () => ({ canManageUsers: true }) });
    const loadSession = vi.fn().mockResolvedValue(undefined);
    authService.loadSession = loadSession;

    expect(await runGuard()).toBe(true);
    expect(loadSession).toHaveBeenCalledTimes(1);
  });
});
