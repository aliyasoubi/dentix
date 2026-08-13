import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { DsAlertComponent, DsAlertVariant } from "./ds-alert.component";

// Signal-backed rather than a plain field: the component is OnPush, so a
// plain property reassignment would not mark it dirty and the re-render
// test below would pass or fail for reasons that have nothing to do with
// the component. This is also how real callers drive it.
@Component({
  imports: [DsAlertComponent],
  template: `<app-ds-alert [variant]="variant()">پیام</app-ds-alert>`,
})
class HostComponent {
  readonly variant = signal<DsAlertVariant>("danger");
}

describe("DsAlertComponent", () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  function banner(): HTMLElement {
    return fixture.debugElement.query(By.css("p")).nativeElement as HTMLElement;
  }

  it("projects the message, so a banner is never colour-only (§6.4)", () => {
    fixture.detectChanges();
    expect(banner().textContent?.trim()).toBe("پیام");
  });

  // The whole reason this is a component and not two CSS classes: callers
  // used to hand-write the role beside the variant, so the pairing held
  // only as long as everyone copied the right line.
  describe("derives the ARIA role from the variant", () => {
    it("interrupts for a failure", () => {
      fixture.componentInstance.variant.set("danger");
      fixture.detectChanges();
      expect(banner().getAttribute("role")).toBe("alert");
      expect(banner().classList).toContain("ds-alert--danger");
    });

    it("stays polite for a confirmation", () => {
      fixture.componentInstance.variant.set("success");
      fixture.detectChanges();
      expect(banner().getAttribute("role")).toBe("status");
      expect(banner().classList).toContain("ds-alert--success");
    });

    it("re-derives the role when the variant changes", () => {
      fixture.componentInstance.variant.set("danger");
      fixture.detectChanges();
      fixture.componentInstance.variant.set("success");
      fixture.detectChanges();

      expect(banner().getAttribute("role")).toBe("status");
      expect(banner().classList).not.toContain("ds-alert--danger");
    });
  });
});
