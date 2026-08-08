import { MatDateFormats } from "@angular/material/core";

/**
 * Display/parse tokens are date-fns-jalali `format()` patterns (same
 * token language as upstream date-fns), consumed only by
 * JalaliDateAdapter.format/parse — never read directly elsewhere.
 */
export const JALALI_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: "yyyy/MM/dd",
  },
  display: {
    dateInput: "yyyy/MM/dd",
    monthYearLabel: "yyyy LLLL",
    dateA11yLabel: "yyyy/MM/dd",
    monthYearA11yLabel: "LLLL yyyy",
  },
};
