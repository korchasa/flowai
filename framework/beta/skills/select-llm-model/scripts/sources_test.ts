import { assert, assertEquals } from "jsr:@std/assert";
import { SOURCES } from "./sources.ts";

// File-level parity: the registry is the single source of truth for which
// sources the skill fetches. Every registered source MUST have a sibling
// `parse-<id>.ts`, and every `parse-<id>.ts` MUST be registered — otherwise
// SKILL.md Phase 2 and the scripts drift apart silently.
function parserFilesOnDisk(): Set<string> {
  const dir = new URL(".", import.meta.url);
  const ids = new Set<string>();
  for (const e of Deno.readDirSync(dir)) {
    const m = e.name.match(/^parse-(.+)\.ts$/);
    if (m && !e.name.endsWith("_test.ts")) ids.add(m[1]);
  }
  return ids;
}

Deno.test("registry: every SOURCES.id has a parse-<id>.ts on disk", () => {
  const files = parserFilesOnDisk();
  for (const s of SOURCES) {
    assert(
      files.has(s.id),
      `SOURCES has '${s.id}' but parse-${s.id}.ts is missing`,
    );
  }
});

Deno.test("registry: every parse-<id>.ts is registered in SOURCES", () => {
  const ids = new Set(SOURCES.map((s) => s.id));
  for (const file of parserFilesOnDisk()) {
    assert(
      ids.has(file),
      `parse-${file}.ts exists but '${file}' is not in SOURCES`,
    );
  }
});

Deno.test("registry: ids are unique", () => {
  const ids = SOURCES.map((s) => s.id);
  assertEquals(new Set(ids).size, ids.length, "duplicate source id");
});

Deno.test("registry: each source declares ≥1 axis, ≥1 url, valid tier", () => {
  for (const s of SOURCES) {
    assert(s.axes.length > 0, `${s.id} has no axes`);
    assert(s.urls.length > 0, `${s.id} has no urls`);
    assert([1, 2, 3].includes(s.tier), `${s.id} has invalid tier ${s.tier}`);
  }
});

Deno.test("registry: AA is the only keyed source and is tier 2", () => {
  const keyed = SOURCES.filter((s) => s.needsKey !== undefined);
  assertEquals(keyed.map((s) => s.id), ["artificial-analysis"]);
  assertEquals(keyed[0].needsKey, "AA_API_KEY");
  assertEquals(keyed[0].tier, 2);
});
