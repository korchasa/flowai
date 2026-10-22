/** One invoice line: quantity times unit price, both in cents. */
export interface Line {
  qty: number;
  unitCents: number;
}

/** Total of one line in cents. */
export function lineTotal(line: Line): number {
  return line.qty * line.unitCents;
}

/** Total of all lines in cents. */
export function invoiceTotal(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}
