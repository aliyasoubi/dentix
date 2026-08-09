import {
  amountRialToString,
  formatMoneyForDisplay,
  formatMoneyInputGrouped,
  fromCanonicalRials,
  parseAmountRialString,
  parseMoneyInput,
  RIALS_PER_TOMAN,
  toCanonicalRials,
} from "./money";

describe("toCanonicalRials", () => {
  it("multiplies toman by 10 to get rials (05-ui-design-system.md's worked example)", () => {
    expect(toCanonicalRials(2_500_000n, "TOMAN")).toBe(25_000_000n);
  });

  it("is the identity for rial", () => {
    expect(toCanonicalRials(25_000_000n, "RIAL")).toBe(25_000_000n);
  });

  it("is exact for a value far beyond Number.MAX_SAFE_INTEGER — no float ever enters the path", () => {
    const hugeToman = 9_007_199_254_740_993n; // MAX_SAFE_INTEGER + 2, a float would round this
    expect(toCanonicalRials(hugeToman, "TOMAN")).toBe(hugeToman * RIALS_PER_TOMAN);
  });
});

describe("fromCanonicalRials", () => {
  it("divides rials by 10 for a whole-toman amount", () => {
    expect(fromCanonicalRials(25_000_000n, "TOMAN")).toBe(2_500_000n);
  });

  it("is the identity for rial", () => {
    expect(fromCanonicalRials(25_000_001n, "RIAL")).toBe(25_000_001n);
  });

  it("returns null rather than rounding when the rial amount isn't a whole number of tomans", () => {
    expect(fromCanonicalRials(25_000_001n, "TOMAN")).toBeNull();
  });

  it("round-trips through toCanonicalRials for every multiple of 10", () => {
    for (const toman of [0n, 1n, 42n, 2_500_000n, 999_999_999_999n]) {
      expect(fromCanonicalRials(toCanonicalRials(toman, "TOMAN"), "TOMAN")).toBe(toman);
    }
  });
});

describe("formatMoneyForDisplay", () => {
  it("shows a whole-toman amount as toman", () => {
    expect(formatMoneyForDisplay(25_000_000n, "TOMAN")).toEqual({ value: 2_500_000n, unit: "TOMAN" });
  });

  it("falls back to a labeled rial amount instead of rounding a non-whole-toman value", () => {
    expect(formatMoneyForDisplay(25_000_001n, "TOMAN")).toEqual({ value: 25_000_001n, unit: "RIAL" });
  });

  it("never fails for rial — every integer rial amount is displayable as rial", () => {
    expect(formatMoneyForDisplay(1n, "RIAL")).toEqual({ value: 1n, unit: "RIAL" });
  });
});

describe("amountRial decimal-string boundary (05-api-guidelines.md)", () => {
  it("parses a positive decimal-integer string", () => {
    expect(parseAmountRialString("25000000")).toBe(25_000_000n);
  });

  it("parses a signed (negative) decimal-integer string — ledger reversals are signed", () => {
    expect(parseAmountRialString("-25000000")).toBe(-25_000_000n);
  });

  it("parses zero", () => {
    expect(parseAmountRialString("0")).toBe(0n);
  });

  it("rejects a decimal point", () => {
    expect(parseAmountRialString("25000000.5")).toBeNull();
  });

  it("rejects a leading zero on a multi-digit number", () => {
    expect(parseAmountRialString("025000000")).toBeNull();
  });

  it("rejects grouping separators — those belong to the entry/display layer, never the wire format", () => {
    expect(parseAmountRialString("25,000,000")).toBeNull();
  });

  it("rejects non-numeric garbage", () => {
    expect(parseAmountRialString("abc")).toBeNull();
  });

  it.each([0n, 1n, -1n, 25_000_000n, -25_000_000n, 9_007_199_254_740_993n, -9_007_199_254_740_993n])(
    "round-trips exactly through amountRialToString for %s",
    (amount) => {
      expect(parseAmountRialString(amountRialToString(amount))).toBe(amount);
    },
  );
});

describe("parseMoneyInput — Persian and Latin digits, with or without grouping separators", () => {
  it("parses plain Latin digits", () => {
    expect(parseMoneyInput("2500000")).toBe(2_500_000n);
  });

  it("parses Latin digits grouped with the Persian thousands separator", () => {
    expect(parseMoneyInput("2٬500٬000")).toBe(2_500_000n);
  });

  it("parses Latin digits grouped with a plain comma", () => {
    expect(parseMoneyInput("2,500,000")).toBe(2_500_000n);
  });

  it("parses Persian digits to the identical value", () => {
    expect(parseMoneyInput("۲٬۵۰۰٬۰۰۰")).toBe(2_500_000n);
  });

  it("parses mixed Persian/Latin digits", () => {
    expect(parseMoneyInput("۲500000")).toBe(2_500_000n);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseMoneyInput("  2500000  ")).toBe(2_500_000n);
  });

  it("rejects ambiguous decimal input rather than guessing", () => {
    expect(parseMoneyInput("2500.5")).toBeNull();
  });

  it("rejects a negative sign — entry fields are unsigned quantities", () => {
    expect(parseMoneyInput("-2500000")).toBeNull();
  });

  it("rejects garbage", () => {
    expect(parseMoneyInput("not a number")).toBeNull();
    expect(parseMoneyInput("")).toBeNull();
  });
});

describe("formatMoneyInputGrouped", () => {
  it("groups by three digits with the Persian thousands separator, in Persian digits", () => {
    expect(formatMoneyInputGrouped(2_500_000n)).toBe("۲٬۵۰۰٬۰۰۰");
  });

  it("does not group a value under 1000", () => {
    expect(formatMoneyInputGrouped(42n)).toBe("۴۲");
  });

  it("round-trips through parseMoneyInput", () => {
    for (const amount of [0n, 42n, 999n, 1000n, 2_500_000n, 999_999_999_999n]) {
      expect(parseMoneyInput(formatMoneyInputGrouped(amount))).toBe(amount);
    }
  });

  it("preserves a negative sign rather than mis-grouping it as a digit (a signed ledger reversal amount can reach display formatting even though entry fields never produce one)", () => {
    expect(formatMoneyInputGrouped(-2_500_000n)).toBe("-۲٬۵۰۰٬۰۰۰");
  });
});
