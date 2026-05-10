import { assertEquals } from "jsr:@std/assert";
import { add } from "./math.ts";

Deno.test("add returns sum of two numbers", () => {
  assertEquals(add(2, 3), 5);
  assertEquals(add(-1, 1), 0);
});
