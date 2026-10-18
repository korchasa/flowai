import { grossTotal } from "../../src/billing/invoice.ts";

Deno.test("gross total adds Bulgarian VAT", () => {
  const total = grossTotal({
    country: "BG",
    lines: [{ description: "plan", net: 50, quantity: 2 }],
  });
  if (total !== 120) throw new Error(`expected 120, got ${total}`);
});
