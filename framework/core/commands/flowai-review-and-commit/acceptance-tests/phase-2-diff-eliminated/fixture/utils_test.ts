import { assertEquals, assertThrows } from "jsr:@std/assert";
import { divide, multiply, sum } from "./utils.ts";

Deno.test("sum: adds two numbers", () => {
  assertEquals(sum(2, 3), 5);
  assertEquals(sum(-1, 1), 0);
});

Deno.test("multiply: multiplies two numbers", () => {
  assertEquals(multiply(3, 4), 12);
  assertEquals(multiply(-2, 5), -10);
});

Deno.test("divide: divides two numbers", () => {
  assertEquals(divide(10, 2), 5);
  assertEquals(divide(-9, 3), -3);
});

Deno.test("divide: throws on zero divisor", () => {
  assertThrows(() => divide(5, 0), Error, "Division by zero");
});
