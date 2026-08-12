import type { Meta, StoryObj } from "@storybook/angular-vite";
import { DsStatusChipComponent } from "./ds-status-chip.component";

const meta: Meta<DsStatusChipComponent> = {
  title: "Design System/StatusChip/DsStatusChip",
  component: DsStatusChipComponent,
  parameters: {
    docs: {
      description: {
        component:
          "UX-DS-001 §13 shared status indicator. Six visual roles map to state families (Draft/Planned → neutral, Scheduled/Active → info, Pending/Waiting → warning, Completed/Ready → success, Cancelled/Skipped → neutral subdued, Overdue/Conflict/Error → danger); label text is mandatory, never icon-only.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<DsStatusChipComponent>;

export const Planned: Story = { args: { label: "برنامه‌ریزی‌شده", tone: "neutral" } };
export const Active: Story = { args: { label: "فعال", tone: "info" } };
export const Pending: Story = { args: { label: "در انتظار", tone: "warning" } };
export const Completed: Story = { args: { label: "تکمیل‌شده", tone: "success" } };
export const Cancelled: Story = { args: { label: "لغوشده", tone: "neutralSubdued" } };
export const Overdue: Story = { args: { label: "دارای تأخیر", tone: "danger" } };
