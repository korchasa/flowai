import { vatRate } from "./tax/rates.ts";

export type Line = { description: string; net: number; quantity: number };

export type Invoice = { country: string; lines: Line[] };

/** Net sum of all lines, before VAT. */
export function netTotal(invoice: Invoice): number {
  return invoice.lines.reduce((sum, l) => sum + l.net * l.quantity, 0);
}

/** Amount the customer pays: net total plus VAT for the invoice country. */
export function grossTotal(invoice: Invoice): number {
  const net = netTotal(invoice);
  return Math.round(net * (1 + vatRate(invoice.country)) * 100) / 100;
}
