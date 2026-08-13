import type { Meta, StoryObj } from "@storybook/angular-vite";
import { moduleMetadata } from "@storybook/angular-vite";
import { DsPageHeaderComponent } from "./ds-page-header.component";

const meta: Meta<DsPageHeaderComponent> = {
  title: "Product/PageHeader/DsPageHeader",
  component: DsPageHeaderComponent,
  decorators: [moduleMetadata({ imports: [DsPageHeaderComponent] })],
  parameters: {
    docs: {
      description: {
        component:
          "UX-DS-001 §11: page title, optional short description, and a content-projected primary action — the pattern every major page follows.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<DsPageHeaderComponent>;

export const TitleOnly: Story = {
  args: { title: "بیماران" },
  render: (args) => ({
    props: args,
    template: `<app-ds-page-header [title]="title"></app-ds-page-header>`,
  }),
};

export const WithDescriptionAndAction: Story = {
  args: { title: "بیماران", description: "ثبت و جستجوی بیماران مطب" },
  render: (args) => ({
    props: args,
    template: `
      <app-ds-page-header [title]="title" [description]="description">
        <button mat-flat-button type="button">ثبت بیمار جدید</button>
      </app-ds-page-header>
    `,
  }),
};
