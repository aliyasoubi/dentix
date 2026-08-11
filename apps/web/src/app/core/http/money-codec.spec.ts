import { asMoney } from "@dentix/kernel";
import { decodeAmountRial, encodeAmountRial } from "./money-codec";

describe("money-codec", () => {
  it("decodes a decimal-integer amountRial string to Money (bigint), not number", () => {
    const money = decodeAmountRial("25000000");
    expect(typeof money).toBe("bigint");
    expect(money).toBe(25_000_000n);
  });

  it("round-trips decode(encode(x)) === x", () => {
    const original = asMoney(-123_456_789_012_345n);
    expect(decodeAmountRial(encodeAmountRial(original))).toBe(original);
  });

  it("rejects a JSON-number-shaped decimal (would already have lost precision upstream)", () => {
    expect(() => decodeAmountRial("2500.5")).toThrow();
  });

  it("rejects a value outside the storable signed-bigint rial range", () => {
    expect(() => decodeAmountRial("99999999999999999999")).toThrow();
  });

  it("encodes zero without a sign or decimal point", () => {
    expect(encodeAmountRial(asMoney(0n))).toBe("0");
  });
});
