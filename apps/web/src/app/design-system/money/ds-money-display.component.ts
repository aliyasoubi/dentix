import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { formatMoneyForDisplay, formatMoneyInputGrouped, MoneyDisplayUnit } from "@dentix/kernel";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { MONEY_CONFIG } from "./money-config";

/**
 * UX-DS-001 "Money input component" / DsMoneyDisplayComponent: renders a
 * canonical rial amount in the configured (or explicitly overridden)
 * unit, with a unit label that is always shown — there is deliberately
 * no input to hide it, since "Never allow a user to remove or hide the
 * unit label" is a hard requirement, not a default.
 */
@Component({
  selector: "app-ds-money-display",
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ds-money-display">
      <span class="ds-money-display__value ds-tabular-nums">{{ formatted().value }}</span>
      <span class="ds-money-display__unit">{{ unitLabelKey() | translate }}</span>
    </span>
  `,
  styleUrl: "./ds-money-display.component.scss",
})
export class DsMoneyDisplayComponent {
  private readonly moneyConfig = inject(MONEY_CONFIG);

  /** Canonical rial amount — never a display-unit value (04-data-model.md: "v1 stores money as signed bigint rials"). */
  readonly amountRial = input.required<bigint>();
  /** Overrides the office's configured default unit for this one amount; omit to follow MONEY_CONFIG. */
  readonly unit = input<MoneyDisplayUnit>();

  protected readonly formatted = computed(() => {
    const resolvedUnit = this.unit() ?? this.moneyConfig.defaultUnit;
    const display = formatMoneyForDisplay(this.amountRial(), resolvedUnit);
    return { value: formatMoneyInputGrouped(display.value), unit: display.unit };
  });

  protected readonly unitLabelKey = computed(() =>
    this.formatted().unit === "TOMAN" ? "common.money.unit.toman" : "common.money.unit.rial",
  );
}
