import { amountRialToString, asMoney, Money, parseAmountRialString } from "@dentix/kernel";

/**
 * 05-api-guidelines.md: "The client adapter converts [amountRial] to
 * bigint and never to JavaScript number for arithmetic." OpenAPI types
 * (api-types.gen.ts) type the wire field as `string`; this is the one
 * place a response's `amountRial` string becomes the kernel's branded
 * `Money`, so no feature imports the kernel's rial parser ad hoc.
 */
export function decodeAmountRial(amountRial: string): Money {
  const money = parseAmountRialString(amountRial);
  if (money === null) {
    throw new Error(`Not a valid amountRial wire value: ${amountRial}`);
  }
  return money;
}

/** Inverse of decodeAmountRial, for request bodies that carry an amountRial field. */
export function encodeAmountRial(amount: Money): string {
  return amountRialToString(asMoney(amount));
}
