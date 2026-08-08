import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { provideJalaliDateAdapter } from "../../core/jalali/provide-jalali-date-adapter";
import { TranslationService } from "../../core/i18n/translation.service";
import { PatientsPage } from "./patients-page";

const STUB_TRANSLATIONS: Record<string, string> = {
  "patients.form.error.INVALID_PHONE": "شماره موبایل معتبر نیست.",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

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

  afterEach(() => {
    httpMock.verify();
  });

  it("accepts a Persian native name and an optional Latin name, and submits both as entered", async () => {
    fixture.componentInstance["form"].setValue({
      nativeName: "زهرا کریمی",
      latinName: "Zahra Karimi",
      phone: "09123456789",
      dateOfBirth: null,
      contactUnavailable: false,
      sex: "unspecified",
    });

    const submitPromise = fixture.componentInstance["submit"]();

    const createReq = httpMock.expectOne("/api/v1/patients");
    expect(createReq.request.method).toBe("POST");
    expect(createReq.request.body).toEqual({
      nativeName: "زهرا کریمی",
      latinName: "Zahra Karimi",
      phone: "09123456789",
      contactUnavailable: false,
      sex: "unspecified",
      dateOfBirth: null,
    });
    createReq.flush({ id: "11111111-1111-1111-1111-111111111111", patientNumber: 1 });
    await fixture.whenStable();

    // submit() re-runs the search after a successful create.
    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush([]);
    await fixture.whenStable();
    await submitPromise;

    expect(fixture.componentInstance["lastCreated"]()?.patientNumber).toBe(1);
    expect(fixture.componentInstance["form"].value.nativeName).toBe("");
  });

  it("converts a picked Jalali date of birth to the canonical Gregorian ISO string on submit", async () => {
    // 1403/01/01 (Farvardin 1, Nowruz) — the ADR-008 boundary fixture.
    const nowruz1403 = fixture.componentInstance["dateAdapter"].createDate(1403, 0, 1);

    fixture.componentInstance["form"].setValue({
      nativeName: "زهرا کریمی",
      latinName: "",
      phone: "",
      dateOfBirth: nowruz1403,
      contactUnavailable: true,
      sex: "unspecified",
    });

    const submitPromise = fixture.componentInstance["submit"]();
    const createReq = httpMock.expectOne("/api/v1/patients");
    expect((createReq.request.body as { dateOfBirth: string | null }).dateOfBirth).toBe("2024-03-20");
    createReq.flush({ id: "22222222-2222-2222-2222-222222222222", patientNumber: 2 });
    await fixture.whenStable();

    httpMock.expectOne((req) => req.url === "/api/v1/patients").flush([]);
    await fixture.whenStable();
    await submitPromise;
  });

  it("does not submit when the native name is blank", async () => {
    fixture.componentInstance["form"].patchValue({ nativeName: "   " });
    await fixture.componentInstance["submit"]();
    httpMock.expectNone((req) => req.method === "POST");
  });

  it("shows the translated error message for a backend validation failure", async () => {
    fixture.componentInstance["form"].setValue({
      nativeName: "رضا احمدی",
      latinName: "",
      phone: "not-a-phone",
      dateOfBirth: null,
      contactUnavailable: false,
      sex: "unspecified",
    });

    const submitPromise = fixture.componentInstance["submit"]();
    const createReq = httpMock.expectOne("/api/v1/patients");
    createReq.flush({ code: "INVALID_PHONE" }, { status: 400, statusText: "Bad Request" });
    await fixture.whenStable();
    await submitPromise;

    expect(fixture.componentInstance["submitError"]()).toBe("شماره موبایل معتبر نیست.");
  });
});
