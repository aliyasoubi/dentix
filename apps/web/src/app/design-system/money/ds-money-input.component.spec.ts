import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { TranslationService } from "../../core/i18n/translation.service";
import { DsMoneyInputComponent } from "./ds-money-input.component";
import { MONEY_CONFIG } from "./money-config";

const STUB_TRANSLATIONS: Record<string, string> = {
  "common.money.unit.toman": "تومان",
  "common.money.unit.rial": "ریال",
  "common.money.canonicalEquivalent": "معادل ثبت‌شده: {{amount}} ریال",
  "common.money.error.invalidAmount": "مبلغ واردشده معتبر نیست.",
};

class StubTranslationService {
  translate(key: string, params?: Readonly<Record<string, string>>): string {
    const template = STUB_TRANSLATIONS[key] ?? key;
    if (!params) {
      return template;
    }
    return Object.entries(params).reduce(
      (msg, [name, value]) => msg.replaceAll(`{{${name}}}`, value),
      template,
    );
  }
}

describe("DsMoneyInputComponent", () => {
  let fixture: ComponentFixture<DsMoneyInputComponent>;

  async function create(defaultUnit: "RIAL" | "TOMAN"): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DsMoneyInputComponent, NoopAnimationsModule],
      providers: [
        { provide: TranslationService, useClass: StubTranslationService },
        { provide: MONEY_CONFIG, useValue: { defaultUnit } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DsMoneyInputComponent);
    fixture.detectChanges();
  }

  function typeIntoInput(value: string): void {
    const input = (fixture.nativeElement as HTMLElement).querySelector("input")!;
    input.value = value;
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
  }

  it("converts a Latin-digit toman entry to its canonical rial value (the 05-ui-design-system.md worked example)", async () => {
    await create("TOMAN");
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    typeIntoInput("2500000");

    expect(onChange).toHaveBeenCalledWith(25_000_000n);
  });

  it("converts a Persian-digit, grouped toman entry to the identical canonical value", async () => {
    await create("TOMAN");
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    typeIntoInput("۲٬۵۰۰٬۰۰۰");

    expect(onChange).toHaveBeenCalledWith(25_000_000n);
  });

  it("shows the rial equivalent for a toman entry", async () => {
    await create("TOMAN");
    typeIntoInput("2500000");

    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("۲۵٬۰۰۰٬۰۰۰");
  });

  it("does not double-convert when the office default unit is rial", async () => {
    await create("RIAL");
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    typeIntoInput("25000000");

    expect(onChange).toHaveBeenCalledWith(25_000_000n);
  });

  it("rejects ambiguous decimal input rather than guessing, and reports invalid to the surrounding form", async () => {
    await create("TOMAN");
    const onChange = vi.fn();
    fixture.componentInstance.registerOnChange(onChange);

    typeIntoInput("2500.5");

    expect(onChange).toHaveBeenCalledWith(null);
    expect(fixture.componentInstance.validate()).toEqual({ invalidMoneyInput: true });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("مبلغ واردشده معتبر نیست.");
  });

  it("always renders the unit label — there is no input to hide it", async () => {
    await create("TOMAN");
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("تومان");
  });

  it("writeValue displays a canonical rial amount converted into the configured entry unit", async () => {
    await create("TOMAN");
    fixture.componentInstance.writeValue(25_000_000n);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector("input")!;
    expect(input.value).toBe("۲٬۵۰۰٬۰۰۰");
  });
});
