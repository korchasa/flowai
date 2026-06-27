import { assertEquals } from "@std/assert";
import { resolveAllowedPacks } from "./runner.ts";

Deno.test("resolveAllowedPacks: core scenario → just core", () => {
  assertEquals(resolveAllowedPacks("core"), ["core"]);
});

Deno.test("resolveAllowedPacks: non-core scenario → core + own pack", () => {
  assertEquals(resolveAllowedPacks("engineering"), ["core", "engineering"]);
});

Deno.test("resolveAllowedPacks: extraPacks appended and deduped", () => {
  assertEquals(
    resolveAllowedPacks("core", ["deno"]),
    ["core", "deno"],
  );
  assertEquals(
    resolveAllowedPacks("engineering", ["devtools"]),
    ["core", "engineering", "devtools"],
  );
});

Deno.test("resolveAllowedPacks: dedupes when extraPacks repeats base", () => {
  assertEquals(resolveAllowedPacks("engineering", ["core", "engineering"]), [
    "core",
    "engineering",
  ]);
});

Deno.test("resolveAllowedPacks: no pack → undefined (copy all)", () => {
  assertEquals(resolveAllowedPacks(undefined), undefined);
  assertEquals(resolveAllowedPacks(undefined, ["deno"]), undefined);
});
