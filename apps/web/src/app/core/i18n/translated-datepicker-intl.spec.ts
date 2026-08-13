import { TestBed } from "@angular/core/testing";
import { MatDatepickerIntl } from "@angular/material/datepicker";
import { provideTranslatedDatepickerIntl } from "./translated-datepicker-intl";
import { TranslationService } from "./translation.service";

const STUB: Record<string, string> = {
  "common.datepicker.calendar": "تقویم",
  "common.datepicker.open": "باز کردن تقویم",
  "common.datepicker.close": "بستن تقویم",
  "common.datepicker.prevMonth": "ماه قبل",
  "common.datepicker.nextMonth": "ماه بعد",
  "common.datepicker.prevYear": "سال قبل",
  "common.datepicker.nextYear": "سال بعد",
  "common.datepicker.prevYearRange": "بازه سال‌های قبل",
  "common.datepicker.nextYearRange": "بازه سال‌های بعد",
  "common.datepicker.switchToMonthView": "نمایش تقویم ماه",
  "common.datepicker.switchToYearView": "انتخاب ماه و سال",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB[key] ?? key;
  }
}

/**
 * Material writes these into `aria-label` itself, so they never appear in a
 * template and no template review or i18n lint can see them. Before this
 * provider existed the Farsi-only UI was announcing "Open calendar" and
 * "Next month" in English (ADR-012). These assertions are the only thing
 * standing between that regression and shipping.
 */
describe("TranslatedDatepickerIntl", () => {
  let intl: MatDatepickerIntl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslationService, useClass: StubTranslationService },
        provideTranslatedDatepickerIntl(),
      ],
    });
    intl = TestBed.inject(MatDatepickerIntl);
  });

  it("replaces Material's default English labels", () => {
    expect(intl.openCalendarLabel).toBe("باز کردن تقویم");
    expect(intl.calendarLabel).toBe("تقویم");
  });

  it("translates every label Material exposes, leaving no English behind", () => {
    const labels = [
      intl.calendarLabel,
      intl.openCalendarLabel,
      intl.closeCalendarLabel,
      intl.prevMonthLabel,
      intl.nextMonthLabel,
      intl.prevYearLabel,
      intl.nextYearLabel,
      intl.prevMultiYearLabel,
      intl.nextMultiYearLabel,
      intl.switchToMonthViewLabel,
      intl.switchToMultiYearViewLabel,
    ];

    for (const label of labels) {
      expect(label).not.toMatch(/[A-Za-z]/);
      // A missing resource makes translate() return the key itself, which
      // would be Latin text too — caught by the assertion above, but worth
      // failing on explicitly rather than by side effect.
      expect(label).not.toContain("common.datepicker");
    }
    expect(labels).toHaveLength(11);
  });
});
