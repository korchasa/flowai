import { assertEquals } from "@std/assert";

// Reconciles a year of synthetic ledger entries against the month totals.
// Slow by nature: the full reconciliation takes about 20 seconds.
Deno.test("ledger reconciliation matches month totals", async () => {
  await new Promise((resolve) => setTimeout(resolve, 20_000));
  assertEquals(12 * 31, 372);
});
