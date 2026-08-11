import {
  amountRialToString,
  asMoney,
  formatMoneyForDisplay,
  formatMoneyInputGrouped,
  fromCanonicalRials,
  isStorableRialAmount,
  MAX_RIAL,
  MIN_RIAL,
  Money,
  parseAmountRialString,
  parseMoneyInput,
  RIALS_PER_TOMAN,
  toCanonicalRials,
  tryAsMoney,
} from "./money";

describe("asMoney / tryAsMoney — the Money type guard (S6: 'Money type over bigint rials')", () => {
  it("asMoney returns the same value for a storable amount, typed as Money", () => {
    const money: Money = asMoney(25_000_000n);
    expect(money).toBe(25_000_000n);
  });

  it("asMoney throws for a value outside the storable rial range, rather than silently accepting it", () => {
    expect(() => asMoney(MAX_RIAL + 1n)).toThrow(/not a storable rial amount/i);
  });

  it("tryAsMoney returns the value for a storable amount", () => {
    expect(tryAsMoney(25_000_000n)).toBe(25_000_000n);
  });

  it("tryAsMoney returns null instead of throwing for an out-of-range amount — the boundary-safe counterpart to asMoney", () => {
    expect(tryAsMoney(MAX_RIAL + 1n)).toBeNull();
    expect(tryAsMoney(MIN_RIAL - 1n)).toBeNull();
  });

  it("accepts exactly the PostgreSQL bigint bounds", () => {
    expect(tryAsMoney(MAX_RIAL)).toBe(MAX_RIAL);
    expect(tryAsMoney(MIN_RIAL)).toBe(MIN_RIAL);
  });
});

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

  // Not "always exact" the way the pre-Money version was documented: a
  // toman amount this large, ×10, overflows the storable rial range.
  // DsMoneyInputComponent has a browser-verified regression test typing
  // in exactly this value and being rejected, rather than silently
  // wrapping or truncating.
  it("returns null — not a wrapped or truncated value — when the toman amount overflows the storable rial range", () => {
    expect(toCanonicalRials(MAX_RIAL, "TOMAN")).toBeNull();
  });

  it("returns null when the rial amount itself is already out of range", () => {
    expect(toCanonicalRials(MAX_RIAL + 1n, "RIAL")).toBeNull();
  });
});

describe("fromCanonicalRials", () => {
  it("divides rials by 10 for a whole-toman amount", () => {
    expect(fromCanonicalRials(asMoney(25_000_000n), "TOMAN")).toBe(2_500_000n);
  });

  it("is the identity for rial", () => {
    expect(fromCanonicalRials(asMoney(25_000_001n), "RIAL")).toBe(25_000_001n);
  });

  it("returns null rather than rounding when the rial amount isn't a whole number of tomans", () => {
    expect(fromCanonicalRials(asMoney(25_000_001n), "TOMAN")).toBeNull();
  });

  it("round-trips through toCanonicalRials for every multiple of 10", () => {
    for (const toman of [0n, 1n, 42n, 2_500_000n, 999_999_999_999n]) {
      const rials = toCanonicalRials(toman, "TOMAN");
      expect(rials).not.toBeNull();
      expect(fromCanonicalRials(rials!, "TOMAN")).toBe(toman);
    }
  });
});

describe("formatMoneyForDisplay", () => {
  it("shows a whole-toman amount as toman", () => {
    expect(formatMoneyForDisplay(asMoney(25_000_000n), "TOMAN")).toEqual({
      value: 2_500_000n,
      unit: "TOMAN",
    });
  });

  it("falls back to a labeled rial amount instead of rounding a non-whole-toman value", () => {
    expect(formatMoneyForDisplay(asMoney(25_000_001n), "TOMAN")).toEqual({
      value: 25_000_001n,
      unit: "RIAL",
    });
  });

  it("never fails for rial — every integer rial amount is displayable as rial", () => {
    expect(formatMoneyForDisplay(asMoney(1n), "RIAL")).toEqual({ value: 1n, unit: "RIAL" });
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

  // 04-data-model.md stores rials in a signed bigint column. Accepting a
  // larger value here would only defer the failure to the INSERT.
  it("accepts the exact PostgreSQL bigint bounds", () => {
    expect(parseAmountRialString(MAX_RIAL.toString())).toBe(MAX_RIAL);
    expect(parseAmountRialString(MIN_RIAL.toString())).toBe(MIN_RIAL);
  });

  it("rejects one past each bound", () => {
    expect(parseAmountRialString((MAX_RIAL + 1n).toString())).toBeNull();
    expect(parseAmountRialString((MIN_RIAL - 1n).toString())).toBeNull();
  });

  it("rejects a wildly out-of-range value that JS BigInt would happily parse", () => {
    expect(parseAmountRialString("99999999999999999999999999")).toBeNull();
  });

  it.each([0n, 1n, -1n, 25_000_000n, -25_000_000n, 9_007_199_254_740_993n, -9_007_199_254_740_993n])(
    "round-trips exactly through amountRialToString for %s",
    (amount) => {
      expect(parseAmountRialString(amountRialToString(asMoney(amount)))).toBe(amount);
    },
  );
});

describe("isStorableRialAmount", () => {
  it.each([0n, 1n, -1n, 25_000_000n, MAX_RIAL, MIN_RIAL])("accepts %s", (amount) => {
    expect(isStorableRialAmount(amount)).toBe(true);
  });

  it.each([MAX_RIAL + 1n, MIN_RIAL - 1n, 10n ** 30n])("rejects %s", (amount) => {
    expect(isStorableRialAmount(amount)).toBe(false);
  });
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

  // Stripping separators before validating their structure would silently
  // invent an amount: "1,2" -> 12, "1,23,4" -> 1234. A money field must
  // reject malformed grouping, not reinterpret it.
  it.each(["1,2", "1٬2", "1,23,4", "1,,2", "25,00,000", "1234,567", ",500", "2,500,"])(
    "rejects malformed grouping %p instead of stripping separators and guessing",
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it.each(["2,500,000", "2٬500٬000", "999", "1,000", "12,345,678"])(
    "accepts correctly grouped %p",
    (input) => {
      expect(parseMoneyInput(input)).not.toBeNull();
    },
  );

  // A leading zero would silently reinterpret "0500" as 500 — the same
  // failure mode as unvalidated grouping, just via a different route.
  // parseAmountRialString already rejects this shape at the API boundary;
  // the entry parser must not be laxer than the wire format it feeds.
  it.each(["0500", "00", "0,500", "01,234"])("rejects a leading zero %p", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });

  it("accepts the literal single digit zero", () => {
    expect(parseMoneyInput("0")).toBe(0n);
  });

  it("tolerates a mixed separator glyph within one number, since either character at a valid group boundary is unambiguous", () => {
    expect(parseMoneyInput("1,234٬567")).toBe(1_234_567n);
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
