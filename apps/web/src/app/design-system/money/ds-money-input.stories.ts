import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { asMoney, Money } from "@dentix/kernel";
import type { Meta, StoryObj } from "@storybook/angular-vite";
import { applicationConfig, moduleMetadata } from "@storybook/angular-vite";
import { DsMoneyInputComponent } from "./ds-money-input.component";
import { MONEY_CONFIG } from "./money-config";

const meta: Meta<DsMoneyInputComponent> = {
  title: "Design System/Money/DsMoneyInput",
  component: DsMoneyInputComponent,
  parameters: {
    docs: {
      description: {
        component:
          "A Reactive Forms control (implements ControlValueAccessor) whose value is always the canonical rial Money value. Accepts Persian or Latin digits with grouping separators; rejects ambiguous decimal input; shows the rial equivalent when entering in toman.",
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

/**
 * A toman-configured office holding a canonical amount that is *not* a whole
 * number of tomans (25,000,001 rial — e.g. a percentage discount or a split
 * payment). The field must degrade to ریال: the digits and the suffix have to
 * agree, or the value reads as ten times itself and the next keystroke writes
 * that back. Emptying the field returns it to تومان.
 *
 * Bound through a real FormControl rather than calling the component method
 * directly, so the story exercises the same ControlValueAccessor path a parent
 * form uses when loading a stored ledger amount.
 */
export const NonWholeTomanValueDegradesToRial: Story = {
  decorators: [
    applicationConfig({ providers: [{ provide: MONEY_CONFIG, useValue: { defaultUnit: "TOMAN" } }] }),
    moduleMetadata({ imports: [ReactiveFormsModule] }),
  ],
  render: () => ({
    props: { amount: new FormControl<Money | null>(asMoney(25_000_001n)) },
    template: `<app-ds-money-input [formControl]="amount" />`,
  }),
};
