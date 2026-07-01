import { assertEquals } from "@std/assert";
import { formatClock } from "../utils/clock.ts";

Deno.test("formatClock: pads single digits", () => {
  assertEquals(formatClock(9, 5), "09:05");
});

Deno.test("formatClock: passes double digits through", () => {
  assertEquals(formatClock(23, 45), "23:45");
});
