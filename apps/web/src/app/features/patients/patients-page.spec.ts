import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { provideRouter, Router } from "@angular/router";
import { TranslationService } from "../../core/i18n/translation.service";
import { provideJalaliDateAdapter } from "../../core/jalali/provide-jalali-date-adapter";
import { PatientRegistrationFormComponent } from "./patient-registration-form/patient-registration-form.component";
import { PatientSearchComponent } from "./patient-search/patient-search.component";
import { CreatePatientRequest, PatientSearchResult } from "./patients-api.service";
import { PatientsPage, SEARCH_DEBOUNCE_MS } from "./patients-page";

const STUB_TRANSLATIONS: Record<string, string> = {
  "patients.form.error.INVALID_PHONE": "شماره موبایل معتبر نیست.",
  "common.error.generic": "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  "patients.form.success": "بیمار ثبت شد.",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

const VALID_REQUEST: CreatePatientRequest = {
  nativeName: "زهرا کریمی",
  latinName: "Zahra Karimi",
  phone: "09123456789",
  contactUnavailable: false,
  sex: "unspecified",
  dateOfBirth: null,
  // Generated as non-optional by openapi-typescript because the schema
  // carries a `default` — real REST semantics still let a caller omit it
  // and get the server-side default; see CreatePatientRequestDto's own
  // `nationality` field for that. This page just isn't the place testing
  // that omission, so the fixture supplies it explicitly.
  nationality: "iranian",
};

const SEARCH_URL = "/api/v1/patients/search";

function result(overrides: Partial<PatientSearchResult> = {}): PatientSearchResult {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    patientNumber: 1,
    nativeName: "زهرا کریمی",
    latinName: "Zahra Karimi",
    phone: "09123456789",
    dateOfBirth: null,
    ...overrides,
  };
}

/**
 * These tests exercise the page as the orchestrator it now is: they drive the
 * child components through their *public* contracts (the form's `submitted`
 * output, the search's `queryChange`) rather than reaching into the page's
 * internals. Form validation lives in the form component's own spec, and
 * error-code mapping in ApiErrorMessageService's.
 */
describe("PatientsPage", () => {
  let fixture: ComponentFixture<PatientsPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PatientsPage, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideJalaliDateAdapter(),
        provideRouter([]),
        { provide: TranslationService, useClass: StubTranslationService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PatientsPage);
    fixture.detectChanges();

    // The initial empty-query search fired from the constructor. This goes
    // through refreshQuery$, not the debounced typedQuery$, so it's already
    // pending with no tick needed.
    httpMock.expectOne(SEARCH_URL).flush([]);
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  function registrationForm(): PatientRegistrationFormComponent {
    return fixture.debugElement.query(By.directive(PatientRegistrationFormComponent))
      .componentInstance as PatientRegistrationFormComponent;
  }

  function search(): PatientSearchComponent {
    return fixture.debugElement.query(By.directive(PatientSearchComponent))
      .componentInstance as PatientSearchComponent;
  }

  it("posts what the form emitted, verbatim", async () => {
    registrationForm().submitted.emit(VALID_REQUEST);

    const createReq = httpMock.expectOne("/api/v1/patients");
    expect(createReq.request.method).toBe("POST");
    expect(createReq.request.body).toEqual(VALID_REQUEST);

    createReq.flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();
    // The post-create refresh goes through refreshQuery$, bypassing the
    // debounce that only applies to user-typed queries.
    httpMock.expectOne(SEARCH_URL).flush([]);
    await fixture.whenStable();
  });

  it("confirms success and clears the form for the next patient", async () => {
    const resetSpy = vi.spyOn(registrationForm(), "reset");
    registrationForm().submitted.emit(VALID_REQUEST);

    httpMock
      .expectOne("/api/v1/patients")
      .flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();
    httpMock.expectOne(SEARCH_URL).flush([]);
    await fixture.whenStable();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance["successMessage"]()).toBe("بیمار ثبت شد.");
  });

  it("shows the translated message for a backend error code, and does not clear the form", async () => {
    const resetSpy = vi.spyOn(registrationForm(), "reset");
    registrationForm().submitted.emit(VALID_REQUEST);

    httpMock
      .expectOne("/api/v1/patients")
      .flush({ code: "INVALID_PHONE" }, { status: 400, statusText: "Bad Request" });
    await fixture.whenStable();

    expect(fixture.componentInstance["submitError"]()).toBe("شماره موبایل معتبر نیست.");
    // Losing everything the user typed because the server rejected one field
    // would be its own bug.
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("refreshes the list after a successful create", async () => {
    const created: PatientSearchResult[] = [result()];

    registrationForm().submitted.emit(VALID_REQUEST);
    httpMock
      .expectOne("/api/v1/patients")
      .flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();
    httpMock.expectOne(SEARCH_URL).flush(created);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search().results()).toEqual(created);
  });

  it("navigates to the patient's detail page when a search result is activated", async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, "navigate").mockResolvedValue(true);

    search().resultActivate.emit(result());

    expect(navigateSpy).toHaveBeenCalledWith(["/patients", result().id]);
  });

  describe("search", () => {
    // Angular's fakeAsync/tick are zone.js APIs and this app has no zone.js
    // dependency at all (it runs zoneless) — Vitest's own fake timers are
    // the correct tool here instead, since RxJS's debounceTime schedules
    // through the global setTimeout, which Vitest's fake timers intercept
    // regardless of zone.js.
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("posts the typed query in the request body, not a query string, after the debounce window", async () => {
      fixture.componentInstance["onQueryChange"]("رضا");

      // Nothing fires before the debounce window closes.
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);
      httpMock.expectNone(SEARCH_URL);

      await vi.advanceTimersByTimeAsync(1);
      const req = httpMock.expectOne(SEARCH_URL);
      expect(req.request.method).toBe("POST");
      // The whole point of this endpoint being POST: a patient's name never
      // appears in req.url, only in the body.
      expect(req.request.url).toBe(SEARCH_URL);
      expect(req.request.body).toEqual({ query: "رضا" });
      req.flush([]);
    });

    it("fires only one request for keystrokes typed within the debounce window", async () => {
      fixture.componentInstance["onQueryChange"]("ر");
      await vi.advanceTimersByTimeAsync(50);
      fixture.componentInstance["onQueryChange"]("رض");
      await vi.advanceTimersByTimeAsync(50);
      fixture.componentInstance["onQueryChange"]("رضا");
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

      const req = httpMock.expectOne(SEARCH_URL);
      expect(req.request.body).toEqual({ query: "رضا" });
      req.flush([]);
    });

    // The bug the debounce/switchMap rewrite fixes: async/await with no
    // cancellation let a slow response for an earlier query land after a
    // faster response for a later one and overwrite it on screen.
    it("does not let a slow response for an earlier query overwrite results for a newer one", async () => {
      fixture.componentInstance["onQueryChange"]("زه");
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      const firstReq = httpMock.expectOne(SEARCH_URL);

      // Typing past the debounce window's own query switches the merged
      // stream to a new value; switchMap unsubscribes the first request
      // before the second is even sent.
      fixture.componentInstance["onQueryChange"]("زهرا");
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(firstReq.cancelled).toBe(true);

      const secondReq = httpMock.expectOne(SEARCH_URL);
      const newer = [result({ nativeName: "زهرا کریمی" })];
      // HttpTestingController.flush() resolves synchronously through the
      // RxJS chain (map/catchError/subscribe all run inline) — no
      // additional wait needed, only the DOM/input-signal refresh below.
      secondReq.flush(newer);
      fixture.detectChanges();

      expect(search().results()).toEqual(newer);
    });

    it("surfaces an error and clears stale rows instead of leaving the old list looking current", async () => {
      fixture.componentInstance["onQueryChange"]("رضا");
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      httpMock.expectOne(SEARCH_URL).flush({ code: "BOOM" }, { status: 500, statusText: "Server Error" });
      fixture.detectChanges();

      expect(search().errorMessage()).toBe("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      expect(search().results()).toEqual([]);
    });
  });

  // Not inside describe("search")'s fake-timer scope: the post-create
  // refresh goes through refreshQuery$, which never touches the debounce
  // timer this suite fakes — it belongs with the other create() tests.
  //
  // The duplicate-patient bug this guards: a failing list refresh must not
  // be reported as a failed creation, or the user retries a create that
  // already worked.
  it("does not report a creation failure when only the post-create refresh fails", async () => {
    registrationForm().submitted.emit(VALID_REQUEST);
    httpMock
      .expectOne("/api/v1/patients")
      .flush({ id: "33333333-3333-3333-3333-333333333333", patientNumber: 3 });
    await fixture.whenStable();

    httpMock.expectOne(SEARCH_URL).flush({ code: "BOOM" }, { status: 500, statusText: "Server Error" });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance["submitError"]()).toBeNull();
    expect(fixture.componentInstance["successMessage"]()).toBe("بیمار ثبت شد.");
    expect(search().errorMessage()).not.toBeNull();
  });
});
