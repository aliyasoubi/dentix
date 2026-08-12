import type { Meta, StoryObj } from "@storybook/angular-vite";
import { DsEmptyStateComponent } from "./ds-empty-state.component";

const meta: Meta<DsEmptyStateComponent> = {
  title: "Design System/EmptyState/DsEmptyState",
  component: DsEmptyStateComponent,
  parameters: {
    docs: {
      description: {
        component: "UX-DS-001 §28 required component — a quiet, non-decorative empty-state surface.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<DsEmptyStateComponent>;

export const TitleOnly: Story = {
  args: { title: "بیماری یافت نشد." },
};

export const WithDescription: Story = {
  args: {
    title: "هنوز بیماری ثبت نشده است.",
    description: "برای شروع، فرم بالای صفحه را تکمیل کنید.",
  },
};
