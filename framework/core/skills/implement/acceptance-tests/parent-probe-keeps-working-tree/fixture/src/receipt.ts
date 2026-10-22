import { invoiceTotal, type Line } from "./invoice.ts";
import { formatMoney } from "./money.ts";

/** One-line receipt summary shown to the customer. */
export function renderReceipt(lines: Line[]): string {
  return `Total: $${formatMoney(invoiceTotal(lines))}`;
}
