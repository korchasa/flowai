import { assertEquals } from "@std/assert";
import { renderReceipt } from "../src/receipt.ts";

Deno.test("renderReceipt shows a small total", () => {
  assertEquals(renderReceipt([{ qty: 2, unitCents: 450 }]), "Total: $9.00");
});

Deno.test("renderReceipt groups thousands in a large total", () => {
  assertEquals(
    renderReceipt([{ qty: 1, unitCents: 123450 }]),
    "Total: $1,234.50",
  );
});
