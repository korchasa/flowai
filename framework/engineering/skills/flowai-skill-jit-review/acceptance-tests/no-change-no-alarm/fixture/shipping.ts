/**
 * Compute shipping cost for a given weight and destination tier.
 * Parent revision — clear, pre-refactor shape.
 */
export function shippingCost(
  weight: number,
  tier: "eu" | "us" | "intl",
): number {
  if (tier === "eu") {
    return 5 + weight * 0.5;
  }
  if (tier === "us") {
    return 8 + weight * 0.7;
  }
  return 12 + weight * 1.1;
}
