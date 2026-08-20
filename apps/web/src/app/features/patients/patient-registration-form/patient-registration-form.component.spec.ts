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
      nationality: "iranian",
      identifierNumber: "",
      email: "",
      province: "",
      city: "",
      district: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      deliveryNotes: "",
      occupation: "",
      referralSource: "",
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
        nationality: "iranian",
        identifierNumber: null,
        email: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
        occupation: null,
        referralSource: null,
      },
    ]);
  });

  it("emits a well-formed national code for the default iranian nationality, mapping an empty one to null", () => {
    fill({ identifierNumber: "1234567891" });
    submit();
    expect(emitted[0]?.nationality).toBe("iranian");
    expect(emitted[0]?.identifierNumber).toBe("1234567891");
  });

  it("emits a well-formed passport number once nationality is switched to foreign", () => {
    fill({ nationality: "foreign", identifierNumber: "AB1234567" });
    submit();
    expect(emitted[0]?.nationality).toBe("foreign");
    expect(emitted[0]?.identifierNumber).toBe("AB1234567");
  });

  it("emits address fields exactly as entered, mapping empty ones to null", () => {
    fill({ province: "تهران", city: "تهران", postalCode: "1234567890" });
    submit();
    expect(emitted[0]?.province).toBe("تهران");
    expect(emitted[0]?.city).toBe("تهران");
    expect(emitted[0]?.postalCode).toBe("1234567890");
    expect(emitted[0]?.district).toBeNull();
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
      fill({ identifierNumber: "1234567890" });
      expect(form().controls.identifierNumber.hasError("iranianNationalCode")).toBe(true);
      submit();
      expect(emitted).toEqual([]);
    });

    it("too-short passport number once nationality is foreign", () => {
      fill({ nationality: "foreign", identifierNumber: "AB" });
      expect(form().controls.identifierNumber.hasError("passportNumber")).toBe(true);
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
        nationality: "iranian",
        identifierNumber: "",
        email: "",
        province: "",
        city: "",
        district: "",
        addressLine1: "",
        addressLine2: "",
        postalCode: "",
        deliveryNotes: "",
        occupation: "",
        referralSource: "",
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

  describe("nationality-driven identifier validation", () => {
    it("re-validates the already-typed identifier the moment nationality changes", () => {
      // A national code that happens to also be a valid-shaped passport —
      // no, deliberately invalid *as a national code* (bad check digit),
      // so switching nationality is what makes it valid, not the value.
      fill({ identifierNumber: "1234567890" });
      expect(form().controls.identifierNumber.hasError("iranianNationalCode")).toBe(true);

      form().controls.nationality.setValue("foreign");

      // Reactive forms don't re-run a sibling control's OWN validators just
      // because another control changed — this only passes because the
      // component explicitly re-triggers it (see the constructor).
      expect(form().controls.identifierNumber.valid).toBe(true);
    });

    it("switches the label from national code to passport", () => {
      expect(component["isForeignNationality"]()).toBe(false);
      form().controls.nationality.setValue("foreign");
      expect(component["isForeignNationality"]()).toBe(true);
    });
  });

  describe("loadValue", () => {
    // The patient detail page's edit mode reuses this form instead of a
    // second one — loadValue is its equivalent of reset(), real values
    // instead of blanks.
    it("patches every control from an existing patient's stored demographics", () => {
      component.loadValue({
        id: "11111111-1111-1111-1111-111111111111",
        patientNumber: 7,
        status: "active",
        nativeName: "زهرا کریمی",
        latinName: "Zahra Karimi",
        phone: "09123456789",
        contactUnavailable: false,
        dateOfBirth: "2024-03-20",
        sex: "female",
        nationality: "foreign",
        identifierNumber: "AB1234567",
        email: "zahra@example.com",
        province: "تهران",
        city: "تهران",
        district: null,
        addressLine1: "خیابان ولیعصر",
        addressLine2: null,
        postalCode: "1234567890",
        deliveryNotes: null,
        occupation: "دندانپزشک",
        referralSource: "اینستاگرام",
        preferredLanguage: "fa-IR",
        version: 3,
      });

      const value = form().getRawValue();
      expect(value.nativeName).toBe("زهرا کریمی");
      expect(value.latinName).toBe("Zahra Karimi");
      expect(value.phone).toBe("09123456789");
      expect(value.sex).toBe("female");
      expect(value.nationality).toBe("foreign");
      expect(value.identifierNumber).toBe("AB1234567");
      expect(value.email).toBe("zahra@example.com");
      expect(value.province).toBe("تهران");
      expect(value.addressLine1).toBe("خیابان ولیعصر");
      expect(value.occupation).toBe("دندانپزشک");
      expect(value.referralSource).toBe("اینستاگرام");
      // The same adapter round trip submit() itself uses in reverse
      // (toIso8601) — the Nowruz-boundary fixture other specs use.
      expect(
        value.dateOfBirth && TestBed.inject<DateAdapter<Date>>(DateAdapter).toIso8601(value.dateOfBirth),
      ).toBe("2024-03-20");
    });

    it("maps null optional fields to empty strings, not null, matching every text control's own type", () => {
      component.loadValue({
        id: "11111111-1111-1111-1111-111111111111",
        patientNumber: 1,
        status: "active",
        nativeName: "رضا احمدی",
        latinName: null,
        phone: null,
        contactUnavailable: true,
        dateOfBirth: null,
        sex: "unspecified",
        nationality: "iranian",
        identifierNumber: null,
        email: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
        occupation: null,
        referralSource: null,
        preferredLanguage: "fa-IR",
        version: 1,
      });

      const value = form().getRawValue();
      expect(value.latinName).toBe("");
      expect(value.phone).toBe("");
      expect(value.identifierNumber).toBe("");
      expect(value.email).toBe("");
      expect(value.province).toBe("");
      expect(value.occupation).toBe("");
      expect(value.referralSource).toBe("");
      expect(value.dateOfBirth).toBeNull();
    });

    it("makes the loaded value submittable, round-tripping back through submit()", () => {
      component.loadValue({
        id: "11111111-1111-1111-1111-111111111111",
        patientNumber: 1,
        status: "active",
        nativeName: "رضا احمدی",
        latinName: null,
        phone: "09123456789",
        contactUnavailable: false,
        dateOfBirth: null,
        sex: "unspecified",
        nationality: "iranian",
        identifierNumber: null,
        email: null,
        province: null,
        city: null,
        district: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        deliveryNotes: null,
        occupation: null,
        referralSource: null,
        preferredLanguage: "fa-IR",
        version: 1,
      });

      submit();
      expect(emitted).toEqual([
        {
          nativeName: "رضا احمدی",
          latinName: null,
          phone: "09123456789",
          contactUnavailable: false,
          sex: "unspecified",
          dateOfBirth: null,
          nationality: "iranian",
          identifierNumber: null,
          email: null,
          province: null,
          city: null,
          district: null,
          addressLine1: null,
          addressLine2: null,
          postalCode: null,
          deliveryNotes: null,
          occupation: null,
          referralSource: null,
        },
      ]);
    });
  });

  describe("submitLabelKey", () => {
    it("defaults to the registration label", () => {
      expect(component.submitLabelKey()).toBe("patients.form.submit");
    });

    it("is overridable, e.g. for the detail page's edit mode", () => {
      fixture.componentRef.setInput("submitLabelKey", "patients.detail.edit.save");
      expect(component.submitLabelKey()).toBe("patients.detail.edit.save");
    });
  });
});
