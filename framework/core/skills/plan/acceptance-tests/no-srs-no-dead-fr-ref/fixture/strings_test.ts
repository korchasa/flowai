import { assertEquals } from "@std/assert";
import { capitalize } from "./strings.ts";

Deno.test("capitalize: uppercases the first letter", () => {
  assertEquals(capitalize("hello"), "Hello");
});

Deno.test("capitalize: leaves an already-capitalized string alone", () => {
  assertEquals(capitalize("Hello"), "Hello");
});

Deno.test("capitalize: returns the empty string unchanged", () => {
  assertEquals(capitalize(""), "");
});

Deno.test("capitalize: keeps the rest of the string untouched", () => {
  assertEquals(capitalize("hELLO wORLD"), "HELLO wORLD");
});

Deno.test("capitalize: treats an astral-plane letter as one character", () => {
  assertEquals(capitalize("𐐨bc"), "𐐀bc");
});
