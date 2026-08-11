import * as fc from "fast-check";
import {
  amountRialToString,
  asMoney,
  formatMoneyForDisplay,
  formatMoneyInputGrouped,
  fromCanonicalRials,
  isStorableRialAmount,
  MAX_RIAL,
  MIN_RIAL,
  parseAmountRialString,
  parseMoneyInput,
  RIALS_PER_TOMAN,
  toCanonicalRials,
  tryAsMoney,
} from "./money";

/**
 * S6's declared contract (docs/08-implementation/02-slices-release-0.5.md):
 * "Property tests — toman<->rial exactness, no float path, no silent
 * rounding". money.spec.ts's example-based tests (frozen fixtures, hand-
 * picked edge cases) stay as the fast, readable regression suite; these
 * generate hundreds of random cases per run specifically to catch the
 * class of bug example tests are structurally blind to — a rounding or
 * truncation that only shows up for values nobody thought to hand-pick.
 */

// A toman amount that, ×10, still lands inside the storable rial range —
// the domain toCanonicalRials(_, "TOMAN") actually promises a result for.
const inRangeTomanAmount = fc.bigInt({ min: MIN_RIAL / RIALS_PER_TOMAN, max: MAX_RIAL / RIALS_PER_TOMAN });

const storableRialAmount = fc.bigInt({ min: MIN_RIAL, max: MAX_RIAL }).map((n) => asMoney(n));

const nonNegativeAmount = fc.bigInt({ min: 0n, max: MAX_RIAL });

describe("toman<->rial exactness (property)", () => {
  it("fromCanonicalRials(toCanonicalRials(toman)) recovers the exact original toman for any in-range amount, not an approximation", () => {
    fc.assert(
      fc.property(inRangeTomanAmount, (toman) => {
        const rials = toCanonicalRials(toman, "TOMAN");
        expect(rials).not.toBeNull();
        expect(fromCanonicalRials(rials!, "TOMAN")).toBe(toman);
      }),
    );
  });

  it("toCanonicalRials is exact multiplication by 10 — no float ever enters, for any magnitude, including far past Number.MAX_SAFE_INTEGER", () => {
    fc.assert(
      fc.property(inRangeTomanAmount, (toman) => {
        const rials = toCanonicalRials(toman, "TOMAN");
        expect(rials).toBe(toman * RIALS_PER_TOMAN);
      }),
    );
  });

  it("RIAL is always the identity in both directions — never a converted value", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: MIN_RIAL, max: MAX_RIAL }), (amount) => {
        expect(toCanonicalRials(amount, "RIAL")).toBe(amount);
      }),
    );
    fc.assert(
      fc.property(storableRialAmount, (money) => {
        expect(fromCanonicalRials(money, "RIAL")).toBe(money);
      }),
    );
  });
});

describe("no silent rounding (property)", () => {
  it("formatMoneyForDisplay never loses information: the displayed value always reconstructs the exact original rial amount", () => {
    fc.assert(
      fc.property(storableRialAmount, fc.constantFrom<"RIAL" | "TOMAN">("RIAL", "TOMAN"), (money, unit) => {
        const display = formatMoneyForDisplay(money, unit);
        const reconstructed = display.unit === "TOMAN" ? display.value * RIALS_PER_TOMAN : display.value;
        expect(reconstructed).toBe(money);
      }),
    );
  });

  it("formatMoneyForDisplay's unit is always exactly RIAL or TOMAN — a label is always determinable, never blank", () => {
    fc.assert(
      fc.property(storableRialAmount, fc.constantFrom<"RIAL" | "TOMAN">("RIAL", "TOMAN"), (money, unit) => {
        const display = formatMoneyForDisplay(money, unit);
        expect(["RIAL", "TOMAN"]).toContain(display.unit);
      }),
    );
  });

  it("fromCanonicalRials never truncates: for TOMAN it's exact division or null, never a rounded quotient", () => {
    fc.assert(
      fc.property(storableRialAmount, (money) => {
        const asToman = fromCanonicalRials(money, "TOMAN");
        if (asToman === null) {
          // Only a genuine remainder justifies null — not an off-by-one
          // or a rounding decision.
          expect(money % RIALS_PER_TOMAN).not.toBe(0n);
        } else {
          expect(asToman * RIALS_PER_TOMAN).toBe(money);
        }
      }),
    );
  });
});

describe("amountRial decimal-string round trip (property, 05-api-guidelines.md)", () => {
  it("parseAmountRialString(amountRialToString(money)) is the exact identity for any storable rial amount", () => {
    fc.assert(
      fc.property(storableRialAmount, (money) => {
        expect(parseAmountRialString(amountRialToString(money))).toBe(money);
      }),
    );
  });
});

describe("entry parsing/formatting round trip (property)", () => {
  it("parseMoneyInput(formatMoneyInputGrouped(amount)) is the exact identity for any non-negative amount", () => {
    fc.assert(
      fc.property(nonNegativeAmount, (amount) => {
        expect(parseMoneyInput(formatMoneyInputGrouped(amount))).toBe(amount);
      }),
    );
  });

  it("grouped formatting never emits a value parseMoneyInput considers malformed", () => {
    fc.assert(
      fc.property(nonNegativeAmount, (amount) => {
        expect(parseMoneyInput(formatMoneyInputGrouped(amount))).not.toBeNull();
      }),
    );
  });
});

describe("Money construction consistency (property)", () => {
  it("tryAsMoney succeeds exactly when isStorableRialAmount says the value is in range — the two checks can never disagree", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: MIN_RIAL - 1000n, max: MAX_RIAL + 1000n }), (amount) => {
        expect(tryAsMoney(amount) !== null).toBe(isStorableRialAmount(amount));
      }),
    );
  });

  it("asMoney returns the value unchanged for anything in range, and throws for anything out of range — never silently clamps or wraps", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: MIN_RIAL - 1000n, max: MAX_RIAL + 1000n }), (amount) => {
        if (isStorableRialAmount(amount)) {
          expect(asMoney(amount)).toBe(amount);
        } else {
          expect(() => asMoney(amount)).toThrow();
        }
      }),
    );
  });
});
