import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from "@angular/core";
import {
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import {
  formatMoneyInputGrouped,
  fromCanonicalRials,
  Money,
  MoneyDisplayUnit,
  parseMoneyInput,
  toCanonicalRials,
} from "@dentix/kernel";
import { TranslatePipe } from "../../../core/i18n/translate.pipe";
import { TranslationService } from "../../../core/i18n/translation.service";
import { MONEY_CONFIG } from "./money-config";

/**
 * UX-DS-001 "Money input component": a Reactive Forms control whose
 * value is always the canonical rial bigint — callers never see or send
 * the display unit, matching "Convert to canonical rials before sending
 * commands." Accepts Persian and Latin digits and grouping separators,
 * rejects decimal input outright (rial/toman are both integer units),
 * and shows the unit label beside the field with no way to hide it.
 *
 * Wraps the native input in its own internal FormControl (rather than
 * plain signals) deliberately: Angular Material's <mat-error>/<mat-hint>
 * auto-switching inside mat-form-field reads the input's NgControl
 * errorState, which stays permanently false without a real FormControl
 * attached — a bare (input) handler cannot drive it.
 *
 * Non-negative entry only, matching kernel's parseMoneyInput contract — a
 * fee, payment, or charge amount is never typed as negative. writeValue
 * will still *display* a negative canonicalRial correctly (a signed
 * ledger reversal, once that exists), but editing it is rejected as
 * invalidMoneyInput rather than misread, since this field has no signed-
 * entry syntax. A ledger UI that needs to edit signed amounts is a
 * separate future component, not this one widened.
 */
@Component({
  selector: "app-ds-money-input",
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" class="ds-money-input">
      <input matInput class="ds-tabular-nums" [formControl]="control" (blur)="onTouched()" />
      <span matTextSuffix class="ds-money-input__unit">{{ unitLabelKey() | translate }}</span>
      <mat-error>{{ "common.money.error.invalidAmount" | translate }}</mat-error>
      @if (equivalentLabel(); as equivalent) {
        <mat-hint>{{ equivalent }}</mat-hint>
      }
    </mat-form-field>
  `,
  styleUrl: "./ds-money-input.component.scss",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DsMoneyInputComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DsMoneyInputComponent),
      multi: true,
    },
  ],
})
export class DsMoneyInputComponent implements ControlValueAccessor, Validator {
  private readonly moneyConfig = inject(MONEY_CONFIG);
  private readonly translation = inject(TranslationService);

  /** Overrides the office's configured default unit for this one field; omit to follow MONEY_CONFIG. */
  readonly unit = input<MoneyDisplayUnit>();

  protected readonly control = new FormControl("", { nonNullable: true });
  private readonly rawText = signal("");

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- ControlValueAccessor default until registerOnChange/registerOnTouched supply the real callback
  private onChange: (value: Money | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- see above
  protected onTouched: () => void = () => {};

  /** The office's configured unit (or this field's explicit override) — what the field uses unless a written value forces otherwise. */
  private readonly configuredUnit = computed(() => this.unit() ?? this.moneyConfig.defaultUnit);

  /**
   * True when writeValue received a canonical rial amount that is not a
   * whole number of tomans, so this field cannot honestly present itself
   * as a toman field for that value.
   *
   * Without this, the field showed the raw rial digits while the suffix
   * still read تومان — a 10x overstatement — and worse, the next keystroke
   * sent those rial digits back through toCanonicalRials(…, "TOMAN"),
   * multiplying the stored amount by ten. The unit label is the contract
   * for how the field's contents are read, so label and interpretation
   * must degrade together or not at all.
   */
  private readonly forcedToRial = signal(false);

  /** The unit this field is actually operating in right now: the label, the digits, and the re-parse all follow this one value. */
  private readonly effectiveUnit = computed<MoneyDisplayUnit>(() =>
    this.forcedToRial() ? "RIAL" : this.configuredUnit(),
  );

  protected readonly unitLabelKey = computed(() =>
    this.effectiveUnit() === "TOMAN" ? "common.money.unit.toman" : "common.money.unit.rial",
  );

  /** Shown only for TOMAN entry, where the canonical value isn't the number the user typed — 05-ui-design-system.md's worked example. */
  protected readonly equivalentLabel = computed(() => {
    if (this.effectiveUnit() !== "TOMAN" || this.rawText().trim() === "") {
      return null;
    }
    const entered = parseMoneyInput(this.rawText());
    if (entered === null) {
      return null;
    }
    const canonical = toCanonicalRials(entered, "TOMAN");
    if (canonical === null) {
      // Overflows the storable rial range — handleInput already reports
      // this through the field's own error state, so there's no sensible
      // equivalent to show here (and mat-form-field hides the hint
      // whenever the error is showing anyway).
      return null;
    }
    return this.translation.translate("common.money.canonicalEquivalent", {
      amount: formatMoneyInputGrouped(canonical),
    });
  });

  constructor() {
    this.control.valueChanges.subscribe((value) => this.handleInput(value));
  }

  private handleInput(value: string): void {
    this.rawText.set(value);
    // markAsTouched immediately, not just on blur: an ambiguous decimal
    // amount should surface as invalid the moment it's typed, matching
    // 05-ui-design-system.md's "Reject ambiguous decimal input" — not
    // deferred until the field loses focus.
    this.control.markAsTouched();

    if (value.trim() === "") {
      // Nothing left to present, so nothing is forcing rial any more:
      // an emptied field reverts to the office's configured unit, the
      // same as a freshly rendered one.
      this.forcedToRial.set(false);
      this.control.setErrors(null);
      this.onChange(null);
      return;
    }
    const entered = parseMoneyInput(value);
    if (entered === null) {
      this.control.setErrors({ invalidMoneyInput: true });
      this.onChange(null);
      return;
    }
    // toCanonicalRials returns null both for a unit it can't convert
    // cleanly and — since kernel's S6 quality pass — for a toman amount
    // whose ×10 would exceed the storable rial range (04-data-model.md).
    // One check now covers both; a separate isStorableRialAmount call
    // here would be redundant with what toCanonicalRials already does.
    const canonical = toCanonicalRials(entered, this.effectiveUnit());
    if (canonical === null) {
      this.control.setErrors({ invalidMoneyInput: true });
      this.onChange(null);
      return;
    }
    this.control.setErrors(null);
    this.onChange(canonical);
  }

  writeValue(canonicalRial: Money | null): void {
    if (canonicalRial === null) {
      this.forcedToRial.set(false);
      this.rawText.set("");
      this.control.setValue("", { emitEvent: false });
      this.control.setErrors(null);
      return;
    }

    // fromCanonicalRials returns null exactly when the configured unit is
    // TOMAN and the amount isn't a whole number of tomans. This field's
    // own entry path can't produce such a value, but the ledger can (a
    // percentage discount, a split payment), so it has to be presented
    // honestly rather than assumed away: fall back to rial *and* relabel
    // the field, so the suffix matches the digits and the next keystroke
    // is re-read as rial too.
    const configured = this.configuredUnit();
    const asConfigured = fromCanonicalRials(canonicalRial, configured);
    this.forcedToRial.set(asConfigured === null);

    const text = formatMoneyInputGrouped(asConfigured ?? canonicalRial);
    this.rawText.set(text);
    this.control.setValue(text, { emitEvent: false });
    this.control.setErrors(null);
  }

  registerOnChange(fn: (value: Money | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // FormControlDirective reflects control.disabled onto the native
    // input's disabled attribute itself — no separate signal needed.
    if (isDisabled) {
      this.control.disable({ emitEvent: false });
    } else {
      this.control.enable({ emitEvent: false });
    }
  }

  validate(): ValidationErrors | null {
    return this.control.hasError("invalidMoneyInput") ? { invalidMoneyInput: true } : null;
  }
}
