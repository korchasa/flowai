import { assertEquals } from "@std/assert";
import { codexRolePacks, resolveAllowedPacks } from "./runner.ts";

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

// A scenario that simulates an environment without subagents must get no
// codex roles: `setup()` cannot remove them, because the runner writes
// `CODEX_HOME/agents/*.toml` after setup has run.
Deno.test("codexRolePacks: noSubagents scenario → no packs", () => {
  assertEquals(
    codexRolePacks({ pack: "core", extraPacks: ["deno"], noSubagents: true }),
    [],
  );
});

Deno.test("codexRolePacks: regular scenario → the allowed packs", () => {
  assertEquals(codexRolePacks({ pack: "engineering" }), [
    "core",
    "engineering",
  ]);
  assertEquals(codexRolePacks({}), undefined);
});
