import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET_MARGIN_PCT, marginAmount, recommendedPrice, round2 } from "./pricing";

describe("advisory pricing", () => {
  it("PRICE-01 recommended price = OEM price + target margin", () => {
    expect(recommendedPrice(42000, 15)).toBe(48300);
    expect(recommendedPrice(42000, DEFAULT_TARGET_MARGIN_PCT)).toBe(48300);
  });

  it("rounds to two decimals", () => {
    expect(recommendedPrice(1234.56, 7.5)).toBe(1327.15);
    expect(round2(1.005)).toBe(1.01);
  });

  it("margin amount is the difference from OEM price", () => {
    expect(marginAmount(42000, 48300)).toBe(6300);
  });

  it("PRICE-02 accepts no final price and returns only a number (cannot set the bid)", () => {
    const result = recommendedPrice(42000, 15);
    expect(typeof result).toBe("number");
  });
});
