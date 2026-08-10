import type { Meta, StoryObj } from "@storybook/angular-vite";
import { applicationConfig } from "@storybook/angular-vite";
import { DsMoneyInputComponent } from "./ds-money-input.component";
import { MONEY_CONFIG } from "./money-config";

const meta: Meta<DsMoneyInputComponent> = {
  title: "Design System/Money/DsMoneyInput",
  component: DsMoneyInputComponent,
  parameters: {
    docs: {
      description: {
        component:
          "A Reactive Forms control (implements ControlValueAccessor) whose value is always the canonical rial bigint. Accepts Persian or Latin digits with grouping separators; rejects ambiguous decimal input; shows the rial equivalent when entering in toman.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<DsMoneyInputComponent>;

/**
 * Human check (release-0.5-walking-skeleton.md S6): type ۲٬۵۰۰٬۰۰۰ (or its
 * Latin-digit equivalent, 2500000) — the rial equivalent ۲۵٬۰۰۰٬۰۰۰ ریال
 * should appear beneath the field, and the تومان label must stay visible
 * throughout.
 */
export const TomanEntry: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "TOMAN" } }] }),
  ],
};

/** Office configured for RIAL entry: no separate equivalent line, since the typed number already is the canonical value. */
export const RialEntry: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "RIAL" } }] }),
  ],
};
