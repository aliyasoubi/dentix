import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { DsDetailFieldComponent } from "./ds-detail-field.component";

@Component({
  imports: [DsDetailFieldComponent],
  template: `<app-ds-detail-field [label]="label()" [value]="value()" [isolateLatin]="isolateLatin()" />`,
})
class HostComponent {
  readonly label = signal("نام لاتین");
  readonly value = signal<string | null>(null);
  readonly isolateLatin = signal(false);
}

describe("DsDetailFieldComponent", () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  function labelEl(): HTMLElement {
    return fixture.debugElement.query(By.css(".ds-detail-field__label")).nativeElement as HTMLElement;
  }

  function valueEl(): HTMLElement {
    return fixture.debugElement.query(By.css(".ds-detail-field__value")).nativeElement as HTMLElement;
  }

  it("renders the label and value", () => {
    fixture.componentInstance.value.set("Zahra Karimi");
    fixture.detectChanges();
    expect(labelEl().textContent?.trim()).toBe("نام لاتین");
    expect(valueEl().textContent?.trim()).toBe("Zahra Karimi");
  });

  it("shows an em-dash placeholder for a null value, rather than an empty cell", () => {
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    expect(valueEl().textContent?.trim()).toBe("—");
  });

  // ADR-012 / §4: an unisolated Latin run next to Persian text reorders on
  // screen — the same requirement DsDataTableColumn's own flag exists for.
  it("applies bidi isolation only when isolateLatin is set", () => {
    fixture.componentInstance.value.set("Zahra Karimi");
    fixture.componentInstance.isolateLatin.set(true);
    fixture.detectChanges();
    expect(valueEl().classList).toContain("ds-ltr-isolate");

    fixture.componentInstance.isolateLatin.set(false);
    fixture.detectChanges();
    expect(valueEl().classList).not.toContain("ds-ltr-isolate");
  });
});
