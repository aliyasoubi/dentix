import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslationService } from "../../core/i18n/translation.service";
import { DsMoneyDisplayComponent } from "./ds-money-display.component";
import { MONEY_CONFIG } from "./money-config";

const STUB_TRANSLATIONS: Record<string, string> = {
  "common.money.unit.toman": "تومان",
  "common.money.unit.rial": "ریال",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

describe("DsMoneyDisplayComponent", () => {
  let fixture: ComponentFixture<DsMoneyDisplayComponent>;

  async function createWithDefaultUnit(defaultUnit: "RIAL" | "TOMAN"): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DsMoneyDisplayComponent],
      providers: [
        { provide: TranslationService, useClass: StubTranslationService },
        { provide: MONEY_CONFIG, useValue: { defaultUnit } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DsMoneyDisplayComponent);
  }

  it("renders the configured office default (TOMAN) — the 05-ui-design-system.md worked example", async () => {
    await createWithDefaultUnit("TOMAN");
    fixture.componentRef.setInput("amountRial", 25_000_000n);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("۲٬۵۰۰٬۰۰۰");
    expect(text).toContain("تومان");
  });

  it("respects an explicit unit override even when the office default differs", async () => {
    await createWithDefaultUnit("TOMAN");
    fixture.componentRef.setInput("amountRial", 25_000_000n);
    fixture.componentRef.setInput("unit", "RIAL");
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("۲۵٬۰۰۰٬۰۰۰");
    expect(text).toContain("ریال");
  });

  it("falls back to a labeled rial amount instead of rounding a non-whole-toman value", async () => {
    await createWithDefaultUnit("TOMAN");
    fixture.componentRef.setInput("amountRial", 25_000_001n);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("۲۵٬۰۰۰٬۰۰۱");
    expect(text).toContain("ریال");
    expect(text).not.toContain("تومان");
  });

  it("renders a rial-configured office correctly", async () => {
    await createWithDefaultUnit("RIAL");
    fixture.componentRef.setInput("amountRial", 25_000_000n);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("۲۵٬۰۰۰٬۰۰۰");
    expect(text).toContain("ریال");
  });
});
