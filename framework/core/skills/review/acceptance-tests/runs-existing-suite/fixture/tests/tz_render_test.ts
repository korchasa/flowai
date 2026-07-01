import { assertEquals } from "@std/assert";
import { renderTzOffset } from "../utils/render.ts";

Deno.test("renderTzOffset: eastern zone renders with negative POSIX delta", () => {
  assertEquals(renderTzOffset("UTC", "+05:30"), "UTC-05:30");
});

Deno.test("renderTzOffset: western zone renders with positive POSIX delta", () => {
  assertEquals(renderTzOffset("PST", "-08:00"), "PST+08:00");
});

Deno.test("renderTzOffset: half-hour western zone renders with positive POSIX delta", () => {
  assertEquals(renderTzOffset("MART", "-09:30"), "MART+09:30");
});
