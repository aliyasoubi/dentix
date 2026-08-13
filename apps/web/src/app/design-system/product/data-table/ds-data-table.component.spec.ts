import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { TranslationService } from "../../../core/i18n/translation.service";
import { DsDataTableColumn, DsDataTableComponent } from "./ds-data-table.component";

const STUB_TRANSLATIONS: Record<string, string> = {
  "col.number": "شماره پرونده",
  "col.name": "نام",
  "col.latin": "نام لاتین",
};

class StubTranslationService {
  translate(key: string): string {
    return STUB_TRANSLATIONS[key] ?? key;
  }
}

interface Row {
  readonly id: number;
  readonly name: string;
  readonly latinName: string | null;
}

const COLUMNS: DsDataTableColumn<Row>[] = [
  { key: "id", headerKey: "col.number", cell: (row) => String(row.id), isolateLatin: true },
  { key: "name", headerKey: "col.name", cell: (row) => row.name },
  { key: "latin", headerKey: "col.latin", cell: (row) => row.latinName ?? "", isolateLatin: true },
];

const ROWS: Row[] = [
  { id: 1, name: "مریم حسینی", latinName: "Maryam Hosseini" },
  { id: 2, name: "رضا احمدی", latinName: null },
];

@Component({
  imports: [DsDataTableComponent],
  template: `<app-ds-data-table [columns]="columns" [rows]="rows()" />`,
})
class HostComponent {
  readonly columns = COLUMNS;
  readonly rows = signal<readonly Row[]>(ROWS);
}

describe("DsDataTableComponent", () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TranslationService, useClass: StubTranslationService }],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  function text(selector: string): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector)).map((el) =>
      (el.textContent ?? "").trim(),
    );
  }

  it("renders translated headers in declared order", () => {
    expect(text("th")).toEqual(["شماره پرونده", "نام", "نام لاتین"]);
  });

  it("renders one row per item, using each column's cell accessor", () => {
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(text("tbody tr:first-child td")).toEqual(["1", "مریم حسینی", "Maryam Hosseini"]);
  });

  // A cell accessor returning "" for null is the caller's decision; the table
  // must not substitute anything of its own.
  it("renders a cell accessor's empty string as an empty cell", () => {
    expect(text("tbody tr:last-child td")).toEqual(["2", "رضا احمدی", ""]);
  });

  // Latin text next to Persian reorders on screen without isolation, so this
  // is a correctness requirement in an RTL-only UI, not decoration.
  it("applies bidi isolation only to columns that ask for it", () => {
    const isolated = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("tbody tr:first-child td"),
    ).map((cell) => cell.classList.contains("ds-ltr-isolate"));

    expect(isolated).toEqual([true, false, true]);
  });

  it("re-renders when rows change", async () => {
    fixture.componentInstance.rows.set([{ id: 9, name: "زهرا کریمی", latinName: null }]);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll("tbody tr")).toHaveLength(1);
    expect(text("tbody tr td")).toEqual(["9", "زهرا کریمی", ""]);
  });

  it("renders headers but no rows for an empty dataset", async () => {
    fixture.componentInstance.rows.set([]);
    await fixture.whenStable();

    expect(text("th")).toHaveLength(3);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll("tbody tr")).toHaveLength(0);
  });
});
