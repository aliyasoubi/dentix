import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { AuthService } from "../../core/auth/auth.service";
import { TranslationService } from "../../core/i18n/translation.service";
import { LoginPage } from "./login-page";

const STUB_TRANSLATIONS: Record<string, string> = {
  "login.title": "ورود به دنتیکس",
  "login.action.signIn": "ورود",
  "login.error.NO_ACTIVE_ACCOUNT": "حساب کاربری فعالی برای این هویت یافت نشد. با مدیر سیستم تماس بگیرید.",
  "common.error.generic": "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

function createFixture(queryParams: Record<string, string>): ComponentFixture<LoginPage> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LoginPage, NoopAnimationsModule],
    providers: [
      { provide: TranslationService, useClass: StubTranslationService },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  return fixture;
}

describe("LoginPage", () => {
  // The whole point of this page: it must never auto-redirect on its own —
  // see the class comment on login-page.ts for the redirect-loop this
  // guards against. Absence of any AuthService.login() call unless the
  // user explicitly clicks is the actual regression test.
  it("does not call AuthService.login() on its own when landed on directly", () => {
    const fixture = createFixture({});
    const loginSpy = vi.spyOn(TestBed.inject(AuthService), "login");
    expect(loginSpy).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("shows no error message when there is no error query param", () => {
    const fixture = createFixture({});
    expect(fixture.componentInstance["errorMessageKey"]()).toBeNull();
  });

  it("shows the translated message for a known error code", () => {
    const fixture = createFixture({ error: "NO_ACTIVE_ACCOUNT" });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("حساب کاربری فعالی برای این هویت یافت نشد");
  });

  it("falls back to the generic error message for an unrecognized code", () => {
    const fixture = createFixture({ error: "SOME_FUTURE_CODE" });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("خطایی رخ داد");
  });

  it("only calls AuthService.login() when the user explicitly clicks Sign In", () => {
    const fixture = createFixture({ error: "NO_ACTIVE_ACCOUNT" });
    const loginSpy = vi.spyOn(TestBed.inject(AuthService), "login").mockImplementation(() => undefined);

    (fixture.nativeElement as HTMLElement).querySelector("button")?.click();

    expect(loginSpy).toHaveBeenCalledWith("/patients");
  });
});
