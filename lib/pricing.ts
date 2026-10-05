export const DEFAULT_TARGET_MARGIN_PCT = 15;

// The recommended price is ADVISORY. It is computed from the OEM price and the target
// margin. Lead time is shown next to it as context but does not alter the figure in this
// release, because the brief does not define how it should. The final bid is always a
// human-entered field; nothing here ever writes final_price.
export function recommendedPrice(oemPrice: number, targetMarginPct: number): number {
  return round2(oemPrice * (1 + targetMarginPct / 100));
}

export function marginAmount(oemPrice: number, finalOrRecommended: number): number {
  return round2(finalOrRecommended - oemPrice);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
