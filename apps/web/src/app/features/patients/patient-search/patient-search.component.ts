import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { formatJalali, isoDateToJalali, toPersianDigits } from "@dentix/kernel";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { DsAlertComponent } from "../../../design-system/foundation/alert/ds-alert.component";
import {
  DsDataTableColumn,
  DsDataTableComponent,
} from "../../../design-system/product/data-table/ds-data-table.component";
import { DsEmptyStateComponent } from "../../../design-system/product/empty-state/ds-empty-state.component";
import { DsSearchFieldComponent } from "../../../design-system/product/search-field/ds-search-field.component";
import { PatientSearchResult } from "../patients-api.service";

/** Table-cell display only (never a datepicker instance) — reaches Jalali behavior through kernel's pure functions directly, per ADR-008's implementation note, rather than the Material DateAdapter reserved for actual picker controls. */
function formatDateOfBirth(isoDate: string | null): string {
  return isoDate ? toPersianDigits(formatJalali(isoDateToJalali(isoDate))) : "";
}

/**
 * Patient search field plus its results.
 *
 * Presentational: it renders whatever results it is given and emits the query
 * as the user types. The debouncing question, and the HTTP call itself, stay
 * with the page — this component has no opinion about how results are found,
 * which is what lets it be tested by setting inputs and reading the DOM.
 */
@Component({
  selector: "app-patient-search",
  imports: [
    DsSearchFieldComponent,
    DsAlertComponent,
    DsDataTableComponent,
    DsEmptyStateComponent,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./patient-search.component.html",
  styleUrl: "./patient-search.component.scss",
})
export class PatientSearchComponent {
  readonly query = input("");
  readonly results = input.required<readonly PatientSearchResult[]>();
  readonly searching = input(false);
  /** False until the first search resolves, so the empty state isn't shown before anything has been looked up. */
  readonly hasSearched = input(false);
  /** Already-localized failure text; when set, the results list is not trustworthy. */
  readonly errorMessage = input<string | null>(null);

  readonly queryChange = output<string>();
  /** Bubbled up rather than navigated here — this component stays presentational; the page decides where a result leads. */
  readonly resultActivate = output<PatientSearchResult>();

  /**
   * Latin isolation on the number, Latin-name and phone columns is a
   * correctness requirement, not styling: in this RTL-only UI an unisolated
   * Latin run adjacent to Persian text reorders on screen (ADR-012 / §4).
   */
  protected readonly columns: readonly DsDataTableColumn<PatientSearchResult>[] = [
    {
      key: "patientNumber",
      headerKey: "patients.list.column.patientNumber",
      cell: (row) => String(row.patientNumber),
      isolateLatin: true,
    },
    { key: "nativeName", headerKey: "patients.list.column.nativeName", cell: (row) => row.nativeName },
    {
      key: "latinName",
      headerKey: "patients.list.column.latinName",
      cell: (row) => row.latinName ?? "",
      isolateLatin: true,
    },
    {
      key: "phone",
      headerKey: "patients.list.column.phone",
      cell: (row) => row.phone ?? "",
      isolateLatin: true,
    },
    {
      key: "dateOfBirth",
      headerKey: "patients.list.column.dateOfBirth",
      cell: (row) => formatDateOfBirth(row.dateOfBirth),
    },
  ];

  protected onInput(value: string): void {
    this.queryChange.emit(value);
  }
}
