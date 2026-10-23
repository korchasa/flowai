import { assertEquals } from "@std/assert";
import { renderReceipt } from "../src/receipt.ts";

Deno.test("renderReceipt shows a small total", () => {
  assertEquals(renderReceipt([{ qty: 2, unitCents: 450 }]), "Total: $9.00");
});
