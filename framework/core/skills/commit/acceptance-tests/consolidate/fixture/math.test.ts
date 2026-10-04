function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}
import { add } from "./math.ts";

Deno.test("add returns sum of two numbers", () => {
  assertEquals(add(1, 2), 3);
});
