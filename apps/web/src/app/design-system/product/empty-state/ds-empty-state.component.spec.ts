import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DsEmptyStateComponent } from "./ds-empty-state.component";

describe("DsEmptyStateComponent", () => {
  let fixture: ComponentFixture<DsEmptyStateComponent>;

  async function create(title: string, description?: string): Promise<void> {
    await TestBed.configureTestingModule({ imports: [DsEmptyStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(DsEmptyStateComponent);
    fixture.componentRef.setInput("title", title);
    if (description !== undefined) {
      fixture.componentRef.setInput("description", description);
    }
    fixture.detectChanges();
  }

  it("renders the title", async () => {
    await create("بیماری یافت نشد.");
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("بیماری یافت نشد.");
  });

  it("does not render a description element when none is given", async () => {
    await create("بیماری یافت نشد.");
    const description = (fixture.nativeElement as HTMLElement).querySelector(".ds-empty-state__description");
    expect(description).toBeNull();
  });

  it("renders a given description", async () => {
    await create("بیماری یافت نشد.", "برای شروع یک بیمار ثبت کنید.");
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("برای شروع یک بیمار ثبت کنید.");
  });
});
