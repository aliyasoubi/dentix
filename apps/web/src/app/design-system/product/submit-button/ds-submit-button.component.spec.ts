import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { DsSubmitButtonComponent } from "./ds-submit-button.component";

@Component({
  imports: [DsSubmitButtonComponent],
  template: `
    <app-ds-submit-button [label]="label()" [submitting]="submitting()" [disabled]="disabled()" />
  `,
})
class HostComponent {
  readonly label = signal("ثبت بیمار");
  readonly submitting = signal(false);
  readonly disabled = signal(false);
}

describe("DsSubmitButtonComponent", () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function button(): HTMLButtonElement {
    return fixture.debugElement.query(By.css("button")).nativeElement as HTMLButtonElement;
  }

  function spinner(): unknown {
    return fixture.debugElement.query(By.css("mat-progress-spinner"));
  }

  it("submits the surrounding form rather than acting as a plain button", () => {
    expect(button().type).toBe("submit");
  });

  it("shows its label and no spinner at rest", () => {
    expect(button().textContent?.trim()).toBe("ثبت بیمار");
    expect(spinner()).toBeNull();
  });

  describe("while submitting", () => {
    beforeEach(() => {
      fixture.componentInstance.submitting.set(true);
      fixture.detectChanges();
    });

    it("swaps the label for a spinner and marks itself busy", () => {
      expect(spinner()).not.toBeNull();
      expect(button().getAttribute("aria-busy")).toBe("true");
    });

    // Guards the double-submit this component exists to prevent: the
    // patients form creates a record, so a second click is a duplicate
    // patient, not a no-op.
    it("is disabled even though the form itself is valid", () => {
      expect(fixture.componentInstance.disabled()).toBe(false);
      expect(button().disabled).toBe(true);
    });
  });

  it("is disabled for an invalid form even when idle", () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
    // Not busy — nothing is in flight, the form is simply not ready.
    expect(button().getAttribute("aria-busy")).toBe("false");
    expect(spinner()).toBeNull();
  });
});
