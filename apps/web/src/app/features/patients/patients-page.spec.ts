import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../core/i18n/translation.service";
import { provideJalaliDateAdapter } from "../../core/jalali/provide-jalali-date-adapter";
import { PatientRegistrationFormComponent } from "./patient-registration-form/patient-registration-form.component";
import { PatientSearchComponent } from "./patient-search/patient-search.component";
import { CreatePatientRequest, PatientSearchResult } from "./patients-api.service";
import { PatientsPage } from "./patients-page";

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
};

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
        { provide: TranslationService, useClass: StubTranslationService },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PatientsPage);
    fixture.detectChanges();

    // The initial empty-query search fired from the constructor.
    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush([]);
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
    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush([]);
    await fixture.whenStable();
  });

  it("confirms success and clears the form for the next patient", async () => {
    const resetSpy = vi.spyOn(registrationForm(), "reset");
    registrationForm().submitted.emit(VALID_REQUEST);

    httpMock
      .expectOne("/api/v1/patients")
      .flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();
    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush([]);
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
    const created: PatientSearchResult[] = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        patientNumber: 1,
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        dateOfBirth: null,
      },
    ];

    registrationForm().submitted.emit(VALID_REQUEST);
    httpMock
      .expectOne("/api/v1/patients")
      .flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();
    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush(created);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(search().results()).toEqual(created);
  });

  describe("search", () => {
    it("passes the typed query to the API", async () => {
      const promise = fixture.componentInstance["onQueryChange"]("رضا");
      const req = httpMock.expectOne((r) => r.url === "/api/v1/patients");
      expect(req.request.params.get("query")).toBe("رضا");
      req.flush([]);
      await fixture.whenStable();
      await promise;
    });

    it("surfaces an error and clears stale rows instead of leaving the old list looking current", async () => {
      const promise = fixture.componentInstance["onQueryChange"]("رضا");
      httpMock
        .expectOne((req) => req.url === "/api/v1/patients")
        .flush({ code: "BOOM" }, { status: 500, statusText: "Server Error" });
      await fixture.whenStable();
      await promise;
      fixture.detectChanges();

      expect(search().errorMessage()).toBe("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      expect(search().results()).toEqual([]);
    });

    // The duplicate-patient bug: a failing list refresh must not be reported
    // as a failed creation, or the user retries a create that already worked.
    it("does not report a creation failure when only the post-create refresh fails", async () => {
      registrationForm().submitted.emit(VALID_REQUEST);
      httpMock
        .expectOne("/api/v1/patients")
        .flush({ id: "33333333-3333-3333-3333-333333333333", patientNumber: 3 });
      await fixture.whenStable();

      httpMock
        .expectOne((req) => req.url === "/api/v1/patients")
        .flush({ code: "BOOM" }, { status: 500, statusText: "Server Error" });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance["submitError"]()).toBeNull();
      expect(fixture.componentInstance["successMessage"]()).toBe("بیمار ثبت شد.");
      expect(search().errorMessage()).not.toBeNull();
    });
  });
});
