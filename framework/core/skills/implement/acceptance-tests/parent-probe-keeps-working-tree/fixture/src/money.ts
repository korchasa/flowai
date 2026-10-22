/** Render an amount in cents as dollars with two decimals, e.g. 123450 -> "1,234.50". */
export function formatMoney(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${dollars}.${rest}`;
}
