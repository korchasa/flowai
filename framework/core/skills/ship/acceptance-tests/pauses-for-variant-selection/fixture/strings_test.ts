import { capitalize, reverse } from "./strings.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

Deno.test("capitalize upper-cases the first character", () => {
  assertEquals(capitalize("hello"), "Hello");
  assertEquals(capitalize(""), "");
});

Deno.test("reverse reverses code points", () => {
  assertEquals(reverse("abc"), "cba");
});
