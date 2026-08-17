import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { MatTableModule } from "@angular/material/table";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";

/**
 * One column of a DsDataTable.
 *
 * `cell` returns a string rather than the component reading `row[key]`:
 * a table cell almost always shows something derived (a Jalali date, a
 * formatted money amount, a joined name) rather than the raw field, and
 * pushing that into the caller keeps all presentation logic in one testable
 * place instead of splitting it between here and a pipe.
 */
export interface DsDataTableColumn<T> {
  /** Stable identifier for the column; also the matColumnDef name. */
  readonly key: string;
  /** Translation key for the header — resolved here so callers stay declarative. */
  readonly headerKey: string;
  readonly cell: (row: T) => string;
  /**
   * Wraps the cell in bidi isolation. Required for Latin names, phone numbers
   * and record numbers in this RTL-only UI (ADR-012 / §4): without it a Latin
   * run adjacent to Persian text reorders on screen, so "Reza Ahmadi" can
   * render with its parts transposed. Chronology and anatomy do not mirror,
   * but stray Latin runs do.
   */
  readonly isolateLatin?: boolean;
}

/**
 * UX-DS-001 §28 item 9. A deliberately small, config-driven table.
 *
 * No sorting, pagination, selection, or virtual scrolling — nothing in the
 * product needs them yet, and 00-build-sequencing.md is explicit that the
 * platform around a capability should not be built before the capability has
 * a consumer. Adding them later is additive; guessing their API now is not.
 *
 * Config-driven rather than content-projected (`<ds-column>` children) because
 * every column this product has needed so far renders text, and a config array
 * is far easier to assert on in a test than projected templates. When a column
 * genuinely needs rich content (a status chip, a row action), add an optional
 * template input alongside `cell` rather than converting everything.
 */
@Component({
  selector: "app-ds-data-table",
  imports: [MatTableModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table mat-table [dataSource]="rows()" class="ds-data-table">
      @for (column of columns(); track column.key) {
        <ng-container [matColumnDef]="column.key">
          <th mat-header-cell *matHeaderCellDef>{{ column.headerKey | translate }}</th>
          <td mat-cell *matCellDef="let row" [class.ds-ltr-isolate]="column.isolateLatin">
            {{ column.cell(row) }}
          </td>
        </ng-container>
      }

      <tr mat-header-row *matHeaderRowDef="columnKeys()"></tr>
      <tr
        mat-row
        *matRowDef="let row; columns: columnKeys()"
        [class.ds-data-table__row--activatable]="activatable()"
        [attr.tabindex]="activatable() ? 0 : null"
        [attr.role]="activatable() ? 'button' : null"
        (click)="onRowActivate(row)"
        (keydown.enter)="onRowActivate(row)"
      ></tr>
    </table>
  `,
  styleUrl: "./ds-data-table.component.scss",
})
export class DsDataTableComponent<T> {
  readonly columns = input.required<readonly DsDataTableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  /** Off by default — most tables this product has today are plain lists; opt in where a row leads somewhere (e.g. the patient detail page). */
  readonly activatable = input(false);

  readonly rowActivate = output<T>();

  /** matHeaderRowDef/matRowDef need a plain string[]; derived so callers only ever declare columns once. */
  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));

  protected onRowActivate(row: T): void {
    if (this.activatable()) {
      this.rowActivate.emit(row);
    }
  }
}
