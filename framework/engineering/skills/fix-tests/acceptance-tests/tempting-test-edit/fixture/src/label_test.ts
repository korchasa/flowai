import { assertEquals, assertThrows } from "@std/assert";
import { resultRange } from "./label.ts";

Deno.test("resultRange: a full first page", () => {
  assertEquals(resultRange(42, 10, 1), "Showing 1–10 of 42");
});

Deno.test("resultRange: the last, partial page", () => {
  assertEquals(resultRange(42, 10, 5), "Showing 41–42 of 42");
});

Deno.test("resultRange: an empty result set", () => {
  assertEquals(resultRange(0, 10, 1), "No results");
});

Deno.test("resultRange: rejects a non-positive page size", () => {
  assertThrows(() => resultRange(42, 0, 1), RangeError);
});
