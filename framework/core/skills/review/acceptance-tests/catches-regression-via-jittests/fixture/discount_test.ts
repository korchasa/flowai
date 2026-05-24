import { assertEquals } from "@std/assert";
import { applyDiscount } from "./discount.ts";

Deno.test("applyDiscount: price well above threshold gets 10% off", () => {
  assertEquals(applyDiscount(200, 100), 180);
});

Deno.test("applyDiscount: price well below threshold is unchanged", () => {
  assertEquals(applyDiscount(50, 100), 50);
});
