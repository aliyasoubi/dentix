import type { Meta, StoryObj } from "@storybook/angular-vite";
import { DsDataTableColumn, DsDataTableComponent } from "./ds-data-table.component";

interface DemoPatient {
  readonly patientNumber: number;
  readonly nativeName: string;
  readonly latinName: string | null;
  readonly phone: string | null;
}

const columns: DsDataTableColumn<DemoPatient>[] = [
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
];

// Fictional data only (CLAUDE.md: "Test data is always fictional").
const rows: DemoPatient[] = [
  { patientNumber: 1, nativeName: "مریم حسینی", latinName: "Maryam Hosseini", phone: "09123456789" },
  { patientNumber: 2, nativeName: "رضا احمدی", latinName: null, phone: "09351234567" },
  { patientNumber: 3, nativeName: "زهرا کریمی", latinName: "Zahra Karimi", phone: null },
];

const meta: Meta<DsDataTableComponent<DemoPatient>> = {
  title: "Product/DataTable/DsDataTable",
  component: DsDataTableComponent,
};
export default meta;

type Story = StoryObj<DsDataTableComponent<DemoPatient>>;

export const Default: Story = {
  args: { columns, rows },
};

/**
 * The mixed-script case this design system keeps insisting on: Latin names and
 * phone numbers sitting next to Persian text. Without the per-column bidi
 * isolation the table applies, these reorder on screen in an RTL context.
 */
export const MixedScript: Story = {
  args: {
    columns,
    rows: [
      { patientNumber: 42, nativeName: "علی رضایی", latinName: "Ali Rezaei", phone: "09121112233" },
      { patientNumber: 43, nativeName: "Sara O'Neil", latinName: "Sara O'Neil", phone: "+989121112244" },
    ],
  },
};

/**
 * Headers still render with no rows. The surrounding feature decides whether
 * to show this or a DsEmptyState instead — the table has no opinion.
 */
export const NoRows: Story = {
  args: { columns, rows: [] },
};
