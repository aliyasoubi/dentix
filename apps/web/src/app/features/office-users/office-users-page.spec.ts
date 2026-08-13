import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { AuthService } from "../../core/auth/auth.service";
import { TranslationService } from "../../core/i18n/translation.service";
import { AddUserFormComponent } from "./add-user-form/add-user-form.component";
import { OfficeUsersPage } from "./office-users-page";

const STUB_TRANSLATIONS: Record<string, string> = {
  "officeUsers.form.error.NOT_FOUND_IN_PROVIDER": "حسابی با این ایمیل یافت نشد.",
  "common.error.generic": "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  "officeUsers.form.success": "کاربر «{{email}}» با موفقیت به مطب افزوده شد.",
  "officeUsers.form.error.RECENT_AUTHENTICATION_REQUIRED": "برای افزودن کاربر، باید به‌تازگی وارد شده باشید.",
};

class StubTranslationService {
  translate(key: string, params?: Record<string, string>): string {
    const template = STUB_TRANSLATIONS[key] ?? key;
    return params ? template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => params[name] ?? "") : template;
  }
}

describe("OfficeUsersPage", () => {
  let fixture: ComponentFixture<OfficeUsersPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OfficeUsersPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslationService, useClass: StubTranslationService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OfficeUsersPage);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  function form(): AddUserFormComponent {
    return fixture.debugElement.query(By.directive(AddUserFormComponent))
      .componentInstance as AddUserFormComponent;
  }

  it("posts what the form emitted, verbatim", () => {
    form().submitted.emit({ email: "reza@example.com" });

    const req = httpMock.expectOne("/api/v1/office-users");
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual({ email: "reza@example.com" });
    req.flush({ officeUserId: "11111111-1111-1111-1111-111111111111" });
  });

  it("confirms success with the submitted email and clears the form", async () => {
    const resetSpy = vi.spyOn(form(), "reset");
    form().submitted.emit({ email: "reza@example.com" });

    httpMock
      .expectOne("/api/v1/office-users")
      .flush({ officeUserId: "11111111-1111-1111-1111-111111111111" });
    await fixture.whenStable();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance["successMessage"]()).toBe(
      "کاربر «reza@example.com» با موفقیت به مطب افزوده شد.",
    );
  });

  it("shows the translated message for a backend error code, and does not clear the form", async () => {
    const resetSpy = vi.spyOn(form(), "reset");
    form().submitted.emit({ email: "nobody@example.com" });

    httpMock
      .expectOne("/api/v1/office-users")
      .flush({ code: "NOT_FOUND_IN_PROVIDER" }, { status: 400, statusText: "Bad Request" });
    await fixture.whenStable();

    expect(fixture.componentInstance["submitError"]()).toBe("حسابی با این ایمیل یافت نشد.");
    // Losing the typed email because the server rejected it would be its
    // own bug — same reasoning as the patients page's equivalent test.
    expect(resetSpy).not.toHaveBeenCalled();
  });

  describe("RECENT_AUTHENTICATION_REQUIRED", () => {
    async function submitAndGetStale(): Promise<void> {
      form().submitted.emit({ email: "reza@example.com" });
      httpMock
        .expectOne("/api/v1/office-users")
        .flush({ code: "RECENT_AUTHENTICATION_REQUIRED" }, { status: 403, statusText: "Forbidden" });
      await fixture.whenStable();
    }

    it("offers a re-authenticate action rather than a dead-end message", async () => {
      await submitAndGetStale();
      expect(fixture.componentInstance["needsReauthentication"]()).toBe(true);
    });

    it("sends the admin through prompt=login, not an ordinary login", async () => {
      const auth = TestBed.inject(AuthService);
      const reauthenticate = vi.spyOn(auth, "reauthenticate").mockImplementation(() => undefined);
      const login = vi.spyOn(auth, "login").mockImplementation(() => undefined);
      await submitAndGetStale();

      fixture.componentInstance["reauthenticate"]();

      expect(reauthenticate).toHaveBeenCalledWith("/office-users");
      // An ordinary login can be answered from the provider's existing SSO
      // session with the same stale auth_time — straight back to this error.
      expect(login).not.toHaveBeenCalled();
    });

    it("keeps the typed email so it survives the round trip", async () => {
      const resetSpy = vi.spyOn(form(), "reset");
      await submitAndGetStale();
      expect(resetSpy).not.toHaveBeenCalled();
    });

    it("clears the flag once a later attempt succeeds", async () => {
      await submitAndGetStale();
      expect(fixture.componentInstance["needsReauthentication"]()).toBe(true);

      form().submitted.emit({ email: "reza@example.com" });
      httpMock
        .expectOne("/api/v1/office-users")
        .flush({ officeUserId: "11111111-1111-1111-1111-111111111111" });
      await fixture.whenStable();

      expect(fixture.componentInstance["needsReauthentication"]()).toBe(false);
    });

    it("does not offer re-authentication for unrelated failures", async () => {
      form().submitted.emit({ email: "nobody@example.com" });
      httpMock
        .expectOne("/api/v1/office-users")
        .flush({ code: "NOT_FOUND_IN_PROVIDER" }, { status: 400, statusText: "Bad Request" });
      await fixture.whenStable();

      expect(fixture.componentInstance["needsReauthentication"]()).toBe(false);
    });
  });

  it("falls back to the generic message for a code this page has no copy for", async () => {
    form().submitted.emit({ email: "reza@example.com" });

    httpMock
      .expectOne("/api/v1/office-users")
      .flush({ code: "INTERNAL_ERROR" }, { status: 500, statusText: "Server Error" });
    await fixture.whenStable();

    expect(fixture.componentInstance["submitError"]()).toBe("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
  });
});
