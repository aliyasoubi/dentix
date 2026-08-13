import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormControl, Validators } from "@angular/forms";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../../core/i18n/translation.service";
import { DsTextFieldComponent } from "./ds-text-field.component";

class StubTranslationService {
  translate(key: string): string {
    return key;
  }
}

@Component({
  imports: [DsTextFieldComponent],
  template: `
    <app-ds-text-field
      [label]="'نام'"
      [control]="control"
      [errors]="{ required: 'error.REQUIRED', email: 'error.INVALID_EMAIL' }"
      [required]="true"
      [latin]="latin()"
    />
  `,
})
class HostComponent {
  readonly control = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  readonly latin = signal(false);
}

describe("DsTextFieldComponent", () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
      providers: [{ provide: TranslationService, useClass: StubTranslationService }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function input(): HTMLInputElement {
    return fixture.debugElement.query(By.css("input")).nativeElement as HTMLInputElement;
  }

  function errorText(): string | null {
    const error = fixture.debugElement.query(By.css("mat-error"));
    return error ? ((error.nativeElement as HTMLElement).textContent?.trim() ?? null) : null;
  }

  it("renders the label and binds to the control the caller owns", () => {
    host.control.setValue("رضا");
    fixture.detectChanges();

    expect(input().value).toBe("رضا");
    expect(fixture.debugElement.query(By.css("mat-label")).nativeElement.textContent).toContain("نام");
  });

  describe("error display", () => {
    // UX-DS-001 §15: validation appears after blur or submit. A form must
    // not open already covered in errors the user has had no chance to cause.
    it("shows nothing while the control is untouched, even though it is invalid", () => {
      expect(host.control.invalid).toBe(true);
      expect(errorText()).toBeNull();
    });

    // The regression this component nearly shipped with: a FormControl's
    // validity and touched state are not signals, so a plain computed()
    // caches its first read and the field silently never shows an error.
    it("appears once the control is touched, without the input reference changing", () => {
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(errorText()).toBe("error.REQUIRED");
    });

    it("follows the control as the failing validator changes", () => {
      host.control.markAsTouched();
      fixture.detectChanges();
      expect(errorText()).toBe("error.REQUIRED");

      host.control.setValue("not-an-email");
      fixture.detectChanges();
      expect(errorText()).toBe("error.INVALID_EMAIL");

      host.control.setValue("reza@example.com");
      fixture.detectChanges();
      expect(errorText()).toBeNull();
    });

    it("ignores validator failures the caller wrote no copy for", () => {
      host.control.setErrors({ somethingUnmapped: true });
      host.control.markAsTouched();
      fixture.detectChanges();

      expect(errorText()).toBeNull();
    });
  });

  describe("latin", () => {
    it("is off by default, so the field inherits the RTL form direction", () => {
      expect(input().getAttribute("dir")).toBeNull();
    });

    it("forces ltr when set, for phone/email-style values (§2.1)", () => {
      host.latin.set(true);
      fixture.detectChanges();

      expect(input().getAttribute("dir")).toBe("ltr");
    });
  });
});
