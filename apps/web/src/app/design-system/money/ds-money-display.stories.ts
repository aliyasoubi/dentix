import { asMoney } from "@dentix/kernel";
import type { Meta, StoryObj } from "@storybook/angular-vite";
import { applicationConfig } from "@storybook/angular-vite";
import { DsMoneyDisplayComponent } from "./ds-money-display.component";
import { MONEY_CONFIG } from "./money-config";

const meta: Meta<DsMoneyDisplayComponent> = {
  title: "Design System/Money/DsMoneyDisplay",
  component: DsMoneyDisplayComponent,
  // ADR-005 / UX-DS-001 §2.1: canonical storage is always rial; every
  // story's amountRial is the same underlying value, only the
  // configured/overridden display unit changes.
  parameters: {
    docs: {
      description: {
        component:
          "Renders a canonical rial amount in the office's configured (or explicitly overridden) unit, with a unit label that can never be hidden.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<DsMoneyDisplayComponent>;

/** Office configured for TOMAN (the common case): 25,000,000 rial displays as ۲٬۵۰۰٬۰۰۰ تومان. */
export const TomanDefault: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "TOMAN" } }] }),
  ],
  args: {
    amountRial: asMoney(25_000_000n),
  },
};

/** Office configured for RIAL: the same 25,000,000 rial amount displays unconverted, as ۲۵٬۰۰۰٬۰۰۰ ریال. */
export const RialDefault: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "RIAL" } }] }),
  ],
  args: {
    amountRial: asMoney(25_000_000n),
  },
};

/** A single amountRial input overrides the office default for just this one display — useful when a screen must show both units side by side. */
export const ExplicitUnitOverride: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "TOMAN" } }] }),
  ],
  args: {
    amountRial: asMoney(25_000_000n),
    unit: "RIAL",
  },
};

/**
 * 25,000,001 rial is not evenly divisible by 10 — it cannot be shown as a
 * whole number of tomans. Per 05-ui-design-system.md the component must
 * never round; it falls back to an explicitly labeled rial amount instead.
 */
export const NonWholeTomanFallsBackToRial: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "TOMAN" } }] }),
  ],
  args: {
    amountRial: asMoney(25_000_001n),
  },
};
