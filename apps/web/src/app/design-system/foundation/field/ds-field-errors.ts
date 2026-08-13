import { computed, Signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { AbstractControl } from "@angular/forms";
import { EMPTY, switchMap } from "rxjs";

/**
 * Maps an Angular validator error key (`required`, `email`, `iranianMobile`)
 * to the translation key describing it, e.g.
 * `{ required: "patients.form.error.NATIVE_NAME_REQUIRED" }`.
 *
 * The field components take this rather than pre-translated strings so the
 * message is resolved at render time by the same TranslatePipe as the rest
 * of the UI, and so a form declares its wording in one place next to the
 * validators it belongs to.
 */
export type DsFieldErrorKeys = Readonly<Record<string, string>>;

/**
 * The translation key for the control's first failing validator, or null.
 *
 * "First" is by declaration order of the map, not by whatever order
 * `control.errors` happens to enumerate — a field with both `required` and
 * a format error should say "this is required" first, and that priority is
 * the caller's to state, not the object-key order's to decide by accident.
 *
 * Returns null while the control is untouched and unsubmitted: UX-DS-001
 * §15 puts validation "after blur or submit", so a form must not open
 * already covered in errors the user has had no chance to cause.
 */
export function firstVisibleErrorKey(
  control: AbstractControl | null | undefined,
  errorKeys: DsFieldErrorKeys,
): string | null {
  if (!control || control.valid || !(control.touched || control.dirty)) {
    return null;
  }
  for (const [validatorKey, translationKey] of Object.entries(errorKeys)) {
    if (control.hasError(validatorKey)) {
      return translationKey;
    }
  }
  return null;
}

/**
 * Reactive wrapper around `firstVisibleErrorKey` for the field components.
 *
 * A plain `computed()` over the control input is not enough and is the kind
 * of bug that only shows up in the browser: a `FormControl`'s validity and
 * touched state are not signals, so the computed would cache the value it
 * read at first render and never recompute — the field would silently never
 * show an error. Bridging `control.events` (which emits value, status,
 * touched and pristine changes) into a signal is what makes the computed
 * re-run at the moments that actually change what should be displayed.
 *
 * Must be called from an injection context — i.e. a field initializer.
 */
export function fieldErrorKey(
  control: Signal<AbstractControl | null | undefined>,
  errorKeys: Signal<DsFieldErrorKeys>,
): Signal<string | null> {
  const controlEvents = toSignal(
    toObservable(control).pipe(switchMap((current) => current?.events ?? EMPTY)),
    { initialValue: null },
  );

  return computed(() => {
    // Read for the dependency, not the value: any control event may have
    // changed whether an error is visible, and which one it is.
    controlEvents();
    return firstVisibleErrorKey(control(), errorKeys());
  });
}
