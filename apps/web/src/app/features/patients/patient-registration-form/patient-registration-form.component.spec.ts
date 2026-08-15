import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DateAdapter } from "@angular/material/core";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../../core/i18n/translation.service";
import { provideJalaliDateAdapter } from "../../../core/jalali/provide-jalali-date-adapter";
import { CreatePatientRequest } from "../patients-api.service";
import { PatientRegistrationFormComponent } from "./patient-registration-form.component";

class StubTranslationService {
  translate(key: string): string {
    return key;
  }
}

describe("PatientRegistrationFormComponent", () => {
  let fixture: ComponentFixture<PatientRegistrationFormComponent>;
  let component: PatientRegistrationFormComponent;
  let emitted: CreatePatientRequest[];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PatientRegistrationFormComponent, NoopAnimationsModule],
      providers: [
        provideJalaliDateAdapter(),
        { provide: TranslationService, useClass: StubTranslationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientRegistrationFormComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.submitted.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
  });

  /** The form group is this component's testable surface — it owns validation. */
  function form(): PatientRegistrationFormComponent["form"] {
    return component["form"];
  }

  function fill(
    overrides: Partial<ReturnType<PatientRegistrationFormComponent["form"]["getRawValue"]>> = {},
  ) {
    form().setValue({
      nativeName: "زهرا کریمی",
      latinName: "",
      phone: "09123456789",
      dateOfBirth: null,
      contactUnavailable: false,
      sex: "unspecified",
      nationalCode: "",
      ...overrides,
    });
  }

  function submit(): void {
    component["submit"]();
  }

  it("emits both names exactly as entered, mapping empty optionals to null", () => {
    fill({ latinName: "Zahra Karimi" });
    submit();

    expect(emitted).toEqual([
      {
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        contactUnavailable: false,
        sex: "unspecified",
        dateOfBirth: null,
        nationalCode: null,
      },
    ]);
  });

  it("emits a well-formed national code, mapping an empty one to null", () => {
    fill({ nationalCode: "1234567891" });
    submit();
    expect(emitted[0]?.nationalCode).toBe("1234567891");
  });

  it("converts a picked Jalali date of birth to the canonical Gregorian ISO string", () => {
    // 1403/01/01 (Farvardin 1, Nowruz) — the ADR-008 boundary fixture.
    const nowruz1403 = TestBed.inject<DateAdapter<Date>>(DateAdapter).createDate(1403, 0, 1);
    fill({ dateOfBirth: nowruz1403, phone: "", contactUnavailable: true });
    submit();

    expect(emitted[0]?.dateOfBirth).toBe("2024-03-20");
  });

  describe("refuses to emit when the form is invalid", () => {
    it("blank native name", () => {
      fill({ nativeName: "   " });
      submit();
      expect(emitted).toEqual([]);
    });

    it("malformed Iranian mobile — caught here rather than round-tripping to the server", () => {
      fill({ phone: "not-a-phone" });
      expect(form().controls.phone.hasError("iranianMobile")).toBe(true);
      submit();
      expect(emitted).toEqual([]);
    });

    it("neither a phone nor the no-contact flag", () => {
      fill({ phone: "", contactUnavailable: false });
      expect(form().hasError("contactRequired")).toBe(true);
      submit();
      expect(emitted).toEqual([]);
    });

    it("checksum-invalid national code — caught here rather than round-tripping to the server", () => {
      fill({ nationalCode: "1234567890" });
      expect(form().controls.nationalCode.hasError("iranianNationalCode")).toBe(true);
      submit();
      expect(emitted).toEqual([]);
    });

    // Without this the submit button appears to do nothing: the group-level
    // contact error and an untouched required field both stay hidden.
    it("marks controls touched so the errors actually become visible", () => {
      fill({ nativeName: "   " });
      expect(form().touched).toBe(false);
      submit();
      expect(form().touched).toBe(true);
    });
  });

  it("accepts the no-contact flag in place of a phone", () => {
    fill({ phone: "", contactUnavailable: true });
    submit();
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.phone).toBeNull();
  });

  describe("reset", () => {
    it("clears the form so the next patient starts blank", () => {
      fill({ latinName: "Zahra Karimi" });
      component.reset();

      expect(form().getRawValue()).toEqual({
        nativeName: "",
        latinName: "",
        phone: "",
        dateOfBirth: null,
        contactUnavailable: false,
        sex: "unspecified",
        nationalCode: "",
      });
    });

    // Public and parent-driven on purpose: only the parent knows the create
    // succeeded. Resetting on submit would discard the user's typing whenever
    // the request failed.
    it("is not performed by submitting alone", () => {
      fill({ latinName: "Zahra Karimi" });
      submit();
      expect(form().getRawValue().nativeName).toBe("زهرا کریمی");
    });
  });
});
