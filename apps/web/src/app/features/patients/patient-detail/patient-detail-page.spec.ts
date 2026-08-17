import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap } from "@angular/router";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../../core/i18n/translation.service";
import { provideJalaliDateAdapter } from "../../../core/jalali/provide-jalali-date-adapter";
import { PatientRegistrationFormComponent } from "../patient-registration-form/patient-registration-form.component";
import { PatientDetail } from "../patients-api.service";
import { PatientDetailPage } from "./patient-detail-page";

const STUB_TRANSLATIONS: Record<string, string> = {
  "patients.detail.loading": "در حال بارگذاری پرونده بیمار...",
  "patients.detail.back": "بازگشت به فهرست بیماران",
  "patients.detail.patientNumber": "شماره پرونده",
  "patients.detail.section.basic": "اطلاعات پایه",
  "patients.detail.section.contact": "اطلاعات تماس",
  "patients.detail.section.address": "آدرس",
  "patients.detail.field.status": "وضعیت",
  "patients.detail.field.contactUnavailable": "بدون روش تماس",
  "patients.detail.status.active": "فعال",
  "patients.detail.error.PATIENT_NOT_FOUND": "این بیمار یافت نشد.",
  "patients.detail.error.MISSING_PERMISSION": "شما مجوز مشاهده این پرونده را ندارید.",
  "common.error.generic": "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  "patients.form.identifierNumber.label.nationalCode": "کد ملی",
  "patients.form.identifierNumber.label.passport": "شماره پاسپورت",
  "patients.detail.edit.start": "ویرایش",
  "patients.detail.edit.heading": "ویرایش اطلاعات بیمار",
  "patients.detail.edit.save": "ذخیره تغییرات",
  "patients.detail.edit.cancel": "انصراف",
  "patients.form.error.VERSION_CONFLICT": "این پرونده در همین حین تغییر کرده است.",
  "patients.form.error.PATIENT_NOT_FOUND": "این بیمار یافت نشد.",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

const PATIENT_ID = "11111111-1111-1111-1111-111111111111";

function detail(overrides: Partial<PatientDetail> = {}): PatientDetail {
  return {
    id: PATIENT_ID,
    patientNumber: 7,
    status: "active",
    nativeName: "زهرا کریمی",
    latinName: "Zahra Karimi",
    phone: "09123456789",
    contactUnavailable: false,
    dateOfBirth: null,
    sex: "unspecified",
    nationality: "iranian",
    identifierNumber: "1234567891",
    province: "تهران",
    city: null,
    district: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    deliveryNotes: null,
    version: 1,
    ...overrides,
  };
}

async function setup(routeId: string | null): Promise<{
  fixture: ComponentFixture<PatientDetailPage>;
  httpMock: HttpTestingController;
}> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [PatientDetailPage, NoopAnimationsModule],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideJalaliDateAdapter(),
      { provide: TranslationService, useClass: StubTranslationService },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } },
      },
    ],
  }).compileComponents();

  const httpMock = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(PatientDetailPage);
  fixture.detectChanges();
  return { fixture, httpMock };
}

describe("PatientDetailPage", () => {
  afterEach(() => {
    // Some tests (the missing-route-param case) never reach HttpClient at
    // all, so verify() would fail for the wrong reason — only assert no
    // *unexpected* request went out.
    TestBed.inject(HttpTestingController).verify();
  });

  it("fetches the patient by the route's id param and renders its fields", async () => {
    const { fixture, httpMock } = await setup(PATIENT_ID);
    const req = httpMock.expectOne(`/api/v1/patients/${PATIENT_ID}`);
    expect(req.request.method).toBe("GET");
    req.flush(detail());
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("زهرا کریمی");
    expect(text).toContain("Zahra Karimi");
    expect(text).toContain("09123456789");
    expect(text).toContain("تهران");
  });

  it("shows the passport label instead of national code once nationality is foreign", async () => {
    const { fixture, httpMock } = await setup(PATIENT_ID);
    httpMock
      .expectOne(`/api/v1/patients/${PATIENT_ID}`)
      .flush(detail({ nationality: "foreign", identifierNumber: "AB1234567" }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent as string).toContain("شماره پاسپورت");
  });

  it("shows a translated not-found message and no crash for a 404", async () => {
    const { fixture, httpMock } = await setup(PATIENT_ID);
    httpMock
      .expectOne(`/api/v1/patients/${PATIENT_ID}`)
      .flush({ code: "PATIENT_NOT_FOUND" }, { status: 404, statusText: "Not Found" });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(".ds-alert"))?.nativeElement.textContent.trim()).toBe(
      "این بیمار یافت نشد.",
    );
  });

  it("shows a translated permission message for a 403", async () => {
    const { fixture, httpMock } = await setup(PATIENT_ID);
    httpMock
      .expectOne(`/api/v1/patients/${PATIENT_ID}`)
      .flush({ code: "MISSING_PERMISSION" }, { status: 403, statusText: "Forbidden" });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css(".ds-alert"))?.nativeElement.textContent.trim()).toBe(
      "شما مجوز مشاهده این پرونده را ندارید.",
    );
  });

  it("never calls the API when the route has no id param", async () => {
    const { fixture } = await setup(null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css(".ds-alert"))?.nativeElement.textContent.trim()).toBe(
      "این بیمار یافت نشد.",
    );
  });

  describe("edit mode", () => {
    async function loadedFixture(overrides: Partial<PatientDetail> = {}): Promise<{
      fixture: ComponentFixture<PatientDetailPage>;
      httpMock: HttpTestingController;
    }> {
      const { fixture, httpMock } = await setup(PATIENT_ID);
      httpMock.expectOne(`/api/v1/patients/${PATIENT_ID}`).flush(detail(overrides));
      await fixture.whenStable();
      fixture.detectChanges();
      return { fixture, httpMock };
    }

    function startEdit(fixture: ComponentFixture<PatientDetailPage>): void {
      fixture.componentInstance["startEdit"]();
      fixture.detectChanges();
    }

    function editForm(fixture: ComponentFixture<PatientDetailPage>): PatientRegistrationFormComponent {
      return fixture.debugElement.query(By.directive(PatientRegistrationFormComponent))
        .componentInstance as PatientRegistrationFormComponent;
    }

    it("pre-fills the form with the currently loaded record when edit starts", async () => {
      const { fixture } = await loadedFixture({ nativeName: "زهرا کریمی", phone: "09123456789" });
      startEdit(fixture);

      const form = editForm(fixture)["form"];
      expect(form.controls.nativeName.value).toBe("زهرا کریمی");
      expect(form.controls.phone.value).toBe("09123456789");
    });

    it("saves via PATCH with If-Match set to the loaded version, then shows the fresh record and exits edit mode", async () => {
      const { fixture, httpMock } = await loadedFixture({ version: 5 });
      startEdit(fixture);

      editForm(fixture).submitted.emit({
        nativeName: "زهرا کریمی‌نژاد",
        latinName: null,
        phone: "09123456789",
        contactUnavailable: false,
        sex: "unspecified",
        dateOfBirth: null,
        nationality: "iranian",
        identifierNumber: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
      });

      const req = httpMock.expectOne(`/api/v1/patients/${PATIENT_ID}`);
      expect(req.request.method).toBe("PATCH");
      expect(req.request.headers.get("If-Match")).toBe("5");
      expect(req.request.body).toEqual({
        nativeName: "زهرا کریمی‌نژاد",
        latinName: null,
        phone: "09123456789",
        contactUnavailable: false,
        sex: "unspecified",
        dateOfBirth: null,
        nationality: "iranian",
        identifierNumber: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
      });

      req.flush(detail({ nativeName: "زهرا کریمی‌نژاد", version: 6 }));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance["editing"]()).toBe(false);
      expect(fixture.nativeElement.textContent as string).toContain("زهرا کریمی‌نژاد");
    });

    it("shows a translated conflict message and stays in edit mode on a 412", async () => {
      const { fixture, httpMock } = await loadedFixture({ version: 5 });
      startEdit(fixture);

      editForm(fixture).submitted.emit({
        nativeName: "دستکاری",
        latinName: null,
        phone: null,
        contactUnavailable: true,
        sex: "unspecified",
        dateOfBirth: null,
        nationality: "iranian",
        identifierNumber: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
      });

      httpMock
        .expectOne(`/api/v1/patients/${PATIENT_ID}`)
        .flush({ code: "VERSION_CONFLICT" }, { status: 412, statusText: "Precondition Failed" });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance["editing"]()).toBe(true);
      expect(fixture.componentInstance["saveError"]()).toBe("این پرونده در همین حین تغییر کرده است.");
    });

    it("discards the edit and returns to the read view without an API call on cancel", async () => {
      const { fixture, httpMock } = await loadedFixture();
      startEdit(fixture);

      fixture.componentInstance["cancelEdit"]();
      fixture.detectChanges();

      expect(fixture.componentInstance["editing"]()).toBe(false);
      httpMock.expectNone(`/api/v1/patients/${PATIENT_ID}`);
    });
  });
});
