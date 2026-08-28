import { assertEquals, assertThrows } from "@std/assert";
import { pageCount, pageOf } from "./pagination.ts";

Deno.test("pageCount: one full page", () => {
  assertEquals(pageCount(10, 10), 1);
});

Deno.test("pageCount: a partial second page", () => {
  assertEquals(pageCount(11, 10), 2);
});

Deno.test("pageCount: empty result set", () => {
  assertEquals(pageCount(0, 10), 1);
});

Deno.test("pageCount: rejects a non-positive page size", () => {
  assertThrows(() => pageCount(10, 0), RangeError);
});

Deno.test("pageOf: first item is on page 1", () => {
  assertEquals(pageOf(0, 10), 1);
});

Deno.test("pageOf: eleventh item is on page 2", () => {
  assertEquals(pageOf(10, 10), 2);
});
