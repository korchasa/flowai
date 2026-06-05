/**
 * Formats an integer amount of cents as a USD currency string.
 * Examples: 1299 -> "$12.99", 5 -> "$0.05", -1299 -> "-$12.99".
 */
export function formatCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError("cents must be an integer");
  }
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = (abs % 100).toString().padStart(2, "0");
  return `${sign}$${dollars}.${remainder}`;
}
