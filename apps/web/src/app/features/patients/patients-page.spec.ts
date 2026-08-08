import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
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
