import { inject, Injectable, Provider } from "@angular/core";
import { MatDatepickerIntl } from "@angular/material/datepicker";
import { TranslationService } from "./translation.service";

/**
 * Material ships its datepicker's accessibility strings in English and they
 * are not covered by the app's own translation pipe, because they never
 * pass through a template — Material reads them off `MatDatepickerIntl` and
 * writes them straight into `aria-label`. Without this, a Farsi-only UI
 * announced "Open calendar", "Next month" and "Choose a date" to screen
 * readers, which ADR-012 does not allow and no amount of template review
 * would have caught: the strings are not in our templates at all.
 *
 * `calendarLabel` and `openCalendarLabel` are the two a user actually meets
 * on the way in; the rest are reached once the calendar is open.
 */
@Injectable()
export class TranslatedDatepickerIntl extends MatDatepickerIntl {
  private readonly translation = inject(TranslationService);

  constructor() {
    super();
    this.calendarLabel = this.translation.translate("common.datepicker.calendar");
    this.openCalendarLabel = this.translation.translate("common.datepicker.open");
    this.closeCalendarLabel = this.translation.translate("common.datepicker.close");
    this.prevMonthLabel = this.translation.translate("common.datepicker.prevMonth");
    this.nextMonthLabel = this.translation.translate("common.datepicker.nextMonth");
    this.prevYearLabel = this.translation.translate("common.datepicker.prevYear");
    this.nextYearLabel = this.translation.translate("common.datepicker.nextYear");
    this.prevMultiYearLabel = this.translation.translate("common.datepicker.prevYearRange");
    this.nextMultiYearLabel = this.translation.translate("common.datepicker.nextYearRange");
    this.switchToMonthViewLabel = this.translation.translate("common.datepicker.switchToMonthView");
    this.switchToMultiYearViewLabel = this.translation.translate("common.datepicker.switchToYearView");
    // Material caches these on subscribers, so anything already rendered
    // needs telling. Harmless at bootstrap, and correct if the resources
    // ever finish loading after a picker exists.
    this.changes.next();
  }
}

/**
 * Registered after the translation resources are loaded (see app.config.ts's
 * initializer ordering) — the labels are read once in the constructor, so a
 * provider constructed too early would cache the raw keys.
 */
export function provideTranslatedDatepickerIntl(): Provider {
  return { provide: MatDatepickerIntl, useClass: TranslatedDatepickerIntl };
}
