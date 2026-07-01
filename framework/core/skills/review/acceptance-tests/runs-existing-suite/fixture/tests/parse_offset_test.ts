import { assertEquals, assertThrows } from "@std/assert";
import { parseOffsetMinutes } from "../utils/parse.ts";

Deno.test("parseOffsetMinutes: eastern offset to positive minutes", () => {
  assertEquals(parseOffsetMinutes("+05:30"), 330);
});

Deno.test("parseOffsetMinutes: western offset to negative minutes", () => {
  assertEquals(parseOffsetMinutes("-08:00"), -480);
});

Deno.test("parseOffsetMinutes: malformed input throws", () => {
  assertThrows(() => parseOffsetMinutes("nonsense"));
});
