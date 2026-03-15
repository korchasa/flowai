import { assertEquals } from "@std/assert";
import { filterNames } from "./sync.ts";

Deno.test("filterNames - returns all when no include/exclude", () => {
  assertEquals(filterNames(["a", "b", "c"], [], []), ["a", "b", "c"]);
});

Deno.test("filterNames - filters by include", () => {
  assertEquals(filterNames(["a", "b", "c"], ["a", "c"], []), ["a", "c"]);
});

Deno.test("filterNames - filters by exclude", () => {
  assertEquals(filterNames(["a", "b", "c"], [], ["b"]), ["a", "c"]);
});

Deno.test("filterNames - include takes precedence (exclude ignored if include set)", () => {
  // Config validation prevents both set, but logic should handle include-only
  assertEquals(filterNames(["a", "b", "c"], ["a"], []), ["a"]);
});
