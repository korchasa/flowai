import { assertEquals } from "jsr:@std/assert";

Deno.test("broken: this test is intentionally failing — do not fix", () => {
  assertEquals(1, 2, "intentional failure to seed a red baseline");
});
