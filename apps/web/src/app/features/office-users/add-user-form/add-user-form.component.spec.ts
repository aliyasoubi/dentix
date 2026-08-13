import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../../core/i18n/translation.service";
import { AddOfficeUserRequest } from "../office-users-api.service";
import { AddUserFormComponent } from "./add-user-form.component";

class StubTranslationService {
  translate(key: string): string {
    return key;
  }
}

describe("AddUserFormComponent", () => {
  let fixture: ComponentFixture<AddUserFormComponent>;
  let component: AddUserFormComponent;
  let emitted: AddOfficeUserRequest[];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AddUserFormComponent, NoopAnimationsModule],
      providers: [{ provide: TranslationService, useClass: StubTranslationService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddUserFormComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.submitted.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
  });

  function form(): AddUserFormComponent["form"] {
    return component["form"];
  }

  function submit(): void {
    component["submit"]();
  }

  it("emits the entered email on submit", () => {
    form().setValue({ email: "reza@example.com" });
    submit();
    expect(emitted).toEqual([{ email: "reza@example.com" }]);
  });

  // Locks in why the component doesn't need its own trim() call.
  it("Validators.email itself rejects whitespace padding", () => {
    form().setValue({ email: "  reza@example.com  " });
    expect(form().controls.email.hasError("email")).toBe(true);
  });

  describe("refuses to emit when the form is invalid", () => {
    it("blank email", () => {
      form().setValue({ email: "" });
      submit();
      expect(emitted).toEqual([]);
    });

    it("malformed email", () => {
      form().setValue({ email: "not-an-email" });
      expect(form().controls.email.hasError("email")).toBe(true);
      submit();
      expect(emitted).toEqual([]);
    });

    // Without this the submit button appears to do nothing.
    it("marks the control touched so the error becomes visible", () => {
      form().setValue({ email: "" });
      expect(form().touched).toBe(false);
      submit();
      expect(form().touched).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears the form", () => {
      form().setValue({ email: "reza@example.com" });
      component.reset();
      expect(form().getRawValue()).toEqual({ email: "" });
    });

    // Public and parent-driven, same reasoning as PatientRegistrationFormComponent.
    it("is not performed by submitting alone", () => {
      form().setValue({ email: "reza@example.com" });
      submit();
      expect(form().getRawValue().email).toBe("reza@example.com");
    });
  });
});
