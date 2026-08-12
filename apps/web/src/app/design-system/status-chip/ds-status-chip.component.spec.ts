import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DsStatusChipComponent, DsStatusChipTone } from "./ds-status-chip.component";

describe("DsStatusChipComponent", () => {
  let fixture: ComponentFixture<DsStatusChipComponent>;

  async function create(label: string, tone: DsStatusChipTone): Promise<void> {
    await TestBed.configureTestingModule({ imports: [DsStatusChipComponent] }).compileComponents();
    fixture = TestBed.createComponent(DsStatusChipComponent);
    fixture.componentRef.setInput("label", label);
    fixture.componentRef.setInput("tone", tone);
    fixture.detectChanges();
  }

  // UX-DS-001 §13: "Every chip must include readable text" — never icon-only.
  it("always renders readable text", async () => {
    await create("برنامه‌ریزی‌شده", "info");
    const text = (fixture.nativeElement as HTMLElement).textContent?.trim();
    expect(text).toBe("برنامه‌ریزی‌شده");
  });

  const toneCases: readonly DsStatusChipTone[] = [
    "neutral",
    "neutralSubdued",
    "info",
    "warning",
    "success",
    "danger",
  ];

  it.each(toneCases)("applies the %s tone class and no other tone class", async (tone) => {
    await create("وضعیت", tone);
    const chip = (fixture.nativeElement as HTMLElement).querySelector(".ds-status-chip");
    expect(chip?.classList.contains(`ds-status-chip--${tone}`)).toBe(true);
    const otherTones = toneCases.filter((candidate) => candidate !== tone);
    for (const other of otherTones) {
      expect(chip?.classList.contains(`ds-status-chip--${other}`)).toBe(false);
    }
  });
});
