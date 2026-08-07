/**
 * Transport-independent result type returned by application use cases.
 * Per 04-architecture/03-module-boundaries.md: a use case "returns a
 * transport-independent result" — never throws for expected domain outcomes.
 */
export type Result<TValue, TErrorCode extends string = string> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly code: TErrorCode; readonly details?: Readonly<Record<string, unknown>> };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function fail<TErrorCode extends string>(
  code: TErrorCode,
  details?: Readonly<Record<string, unknown>>,
): Result<never, TErrorCode> {
  return details === undefined ? { ok: false, code } : { ok: false, code, details };
}
