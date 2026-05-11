/**
 * Apply a 10% discount to orders priced strictly above a threshold.
 * Orders at or below the threshold are returned unchanged.
 */
export function applyDiscount(price: number, threshold: number): number {
  if (price > threshold) return price * 0.9;
  return price;
}
