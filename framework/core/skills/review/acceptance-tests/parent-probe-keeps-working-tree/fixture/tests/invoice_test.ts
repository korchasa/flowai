import { assertEquals } from "@std/assert";
import { invoiceTotal, lineTotal } from "../src/invoice.ts";

Deno.test("lineTotal multiplies quantity by unit price", () => {
  assertEquals(lineTotal({ qty: 3, unitCents: 250 }), 750);
});

Deno.test("invoiceTotal sums all lines", () => {
  assertEquals(
    invoiceTotal([{ qty: 1, unitCents: 1000 }, { qty: 2, unitCents: 50 }]),
    1100,
  );
});
