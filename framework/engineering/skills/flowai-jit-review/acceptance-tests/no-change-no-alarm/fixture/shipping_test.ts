import { assertEquals } from "@std/assert";
import { shippingCost } from "./shipping.ts";

Deno.test("shippingCost: EU base rate", () => {
  assertEquals(shippingCost(0, "eu"), 5);
});

Deno.test("shippingCost: US with weight", () => {
  assertEquals(shippingCost(10, "us"), 15);
});

Deno.test("shippingCost: intl with weight", () => {
  assertEquals(shippingCost(2, "intl"), 14.2);
});
