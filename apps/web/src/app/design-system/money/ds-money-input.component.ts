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
  MoneyDisplayUnit,
  parseMoneyInput,
  toCanonicalRials,
} from "@dentix/kernel";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslationService } from "../../core/i18n/translation.service";
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
  protected readonly disabled = signal(false);

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- ControlValueAccessor default until registerOnChange/registerOnTouched supply the real callback
  private onChange: (value: bigint | null) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- see above
  protected onTouched: () => void = () => {};

  private readonly resolvedUnit = computed(() => this.unit() ?? this.moneyConfig.defaultUnit);

  protected readonly unitLabelKey = computed(() =>
    this.resolvedUnit() === "TOMAN" ? "common.money.unit.toman" : "common.money.unit.rial",
  );

  /** Shown only for TOMAN entry, where the canonical value isn't the number the user typed — 05-ui-design-system.md's worked example. */
  protected readonly equivalentLabel = computed(() => {
    if (this.resolvedUnit() !== "TOMAN" || this.rawText().trim() === "") {
      return null;
    }
    const entered = parseMoneyInput(this.rawText());
    if (entered === null) {
      return null;
    }
    const canonical = toCanonicalRials(entered, "TOMAN");
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
    this.control.setErrors(null);
    this.onChange(toCanonicalRials(entered, this.resolvedUnit()));
  }

  writeValue(canonicalRial: bigint | null): void {
    if (canonicalRial === null) {
      this.rawText.set("");
      this.control.setValue("", { emitEvent: false });
      this.control.setErrors(null);
      return;
    }
    // fromCanonicalRials returns null only when unit=TOMAN and the rial
    // amount isn't a whole number of tomans — an externally-set value
    // this field's own entry path could never itself produce. Falling
    // back to the raw rial figure keeps writeValue total rather than
    // throwing on a value it merely didn't originate.
    const entryAmount = fromCanonicalRials(canonicalRial, this.resolvedUnit()) ?? canonicalRial;
    const text = formatMoneyInputGrouped(entryAmount);
    this.rawText.set(text);
    this.control.setValue(text, { emitEvent: false });
    this.control.setErrors(null);
  }

  registerOnChange(fn: (value: bigint | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
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
