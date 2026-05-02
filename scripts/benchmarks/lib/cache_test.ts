/**
 * Unit tests for the benchmark result cache layer.
 *
 * Covers:
 *   - Deterministic cache-key computation.
 *   - Each input-class invalidates the key when mutated.
 *   - IDE CLI version is included in the key (empty string is a stable value).
 *   - Judge `reason` strings are truncated to MAX_REASON_LEN in trimmed results.
 *   - Read/write round-trip and graceful failure modes (missing file, corrupt
 *     JSON, schema mismatch).
 *   - Drift guard: any cross-package import from `scripts/benchmarks/lib/**`
 *     must appear in the whitelist that `computeCacheKey` hashes.
 */

import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import {
  CACHE_SCHEMA_VERSION,
  type CacheEntry,
  cacheFilePath,
  computeCacheKey,
  MAX_REASON_LEN,
  readCache,
  trimResultForCache,
  writeCache,
} from "./cache.ts";

const REPO_ROOT = Deno.cwd();

/**
 * Creates a self-contained fake scenario under a temp dir so mutations do not
 * touch the real framework tree.
 */
async function makeFakeScenario(root: string): Promise<BenchmarkScenario> {
  const scenarioDir = join(root, "scenario");
  const fixtureDir = join(scenarioDir, "fixture");
  const primitiveDir = join(root, "primitive");
  await Deno.mkdir(fixtureDir, { recursive: true });
  await Deno.mkdir(primitiveDir, { recursive: true });

  await Deno.writeTextFile(join(scenarioDir, "mod.ts"), "// mod.ts v1\n");
  await Deno.writeTextFile(join(fixtureDir, "f.txt"), "fix v1\n");
  await Deno.writeTextFile(join(primitiveDir, "SKILL.md"), "# SKILL v1\n");

  const scenario: BenchmarkScenario = {
    id: "fake-scenario",
    name: "Fake",
    pack: "__no_such_pack__",
    targetAgentPath: join(primitiveDir, "SKILL.md"),
    fixturePath: fixtureDir,
    sandboxState: { commits: [], expectedOutcome: "" },
    setup: () => Promise.resolve(),
    userQuery: "hi",
    agentsTemplateVars: { PROJECT_NAME: "X" },
    checklist: [],
  };
  return scenario;
}

Deno.test("computeCacheKey: deterministic for identical inputs", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const key1 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "claude-sonnet-4-6",
      runs: 1,
      ideCliVersion: "1.0.0",
    });
    const key2 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "claude-sonnet-4-6",
      runs: 1,
      ideCliVersion: "1.0.0",
    });
    assertEquals(key1, key2);
    assert(/^[0-9a-f]{64}$/.test(key1), "key should be sha256 hex");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when scenario mod.ts changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const base = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    await Deno.writeTextFile(
      join(dirname(scenario.fixturePath!), "mod.ts"),
      "// mod.ts v2\n",
    );
    const after = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(base, after);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when primitive SKILL.md changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const base = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    await Deno.writeTextFile(scenario.targetAgentPath!, "# SKILL v2\n");
    const after = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(base, after);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when fixture file changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const base = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    await Deno.writeTextFile(
      join(scenario.fixturePath!, "f.txt"),
      "fix v2\n",
    );
    const after = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(base, after);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when ide argument changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const k1 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    const k2 = await computeCacheKey({
      scenario,
      ide: "cursor",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(k1, k2);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when agentModel changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const k1 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "a",
      runs: 1,
      ideCliVersion: "",
    });
    const k2 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "b",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(k1, k2);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when ideCliVersion changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const k1 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "1.2.3",
    });
    const k2 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "1.2.4",
    });
    assertNotEquals(k1, k2);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: empty ideCliVersion is stable and does not crash", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const a = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    const b = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertEquals(a, b);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: changes when runs count changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    const k1 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    const k3 = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 3,
      ideCliVersion: "",
    });
    assertNotEquals(k1, k3);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("computeCacheKey: missing fixture dir does not crash", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  try {
    const scenario = await makeFakeScenario(tmp);
    // Remove the fixture directory entirely.
    await Deno.remove(scenario.fixturePath!, { recursive: true });
    const key = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assert(/^[0-9a-f]{64}$/.test(key));
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("cacheFilePath: produces pack-scoped JSON path", () => {
  const scenario: BenchmarkScenario = {
    id: "my-scenario",
    name: "My",
    pack: "core",
    sandboxState: { commits: [], expectedOutcome: "" },
    setup: () => Promise.resolve(),
    userQuery: "",
    agentsTemplateVars: { PROJECT_NAME: "X" },
    checklist: [],
  };
  const p = cacheFilePath(scenario, "claude");
  assertEquals(
    relative(REPO_ROOT, p).replaceAll("\\", "/"),
    "benchmarks/cache/core/my-scenario/claude.json",
  );
});

Deno.test("readCache: returns null on missing file", async () => {
  const scenario: BenchmarkScenario = {
    id: "no-such-scenario-xyz",
    name: "N",
    pack: "__no_pack__",
    sandboxState: { commits: [], expectedOutcome: "" },
    setup: () => Promise.resolve(),
    userQuery: "",
    agentsTemplateVars: { PROJECT_NAME: "X" },
    checklist: [],
  };
  const got = await readCache(scenario, "claude");
  assertEquals(got, null);
});

Deno.test("writeCache + readCache: round-trip", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  const origCwd = Deno.cwd();
  try {
    Deno.chdir(tmp);
    const scenario: BenchmarkScenario = {
      id: "rt",
      name: "RT",
      pack: "p",
      sandboxState: { commits: [], expectedOutcome: "" },
      setup: () => Promise.resolve(),
      userQuery: "",
      agentsTemplateVars: { PROJECT_NAME: "X" },
      checklist: [],
    };
    const entry: CacheEntry = {
      schema: CACHE_SCHEMA_VERSION,
      key: "deadbeef",
      scenarioId: "rt",
      ide: "claude",
      agentModel: "m",
      recordedAt: "2026-04-17T00:00:00.000Z",
      result: {
        success: true,
        score: 100,
        errorsCount: 0,
        warningsCount: 0,
        durationMs: 1234,
        tokensUsed: 10,
        totalCost: 0,
        toolCallsCount: 2,
        model: "m",
        checklistResults: { a: { pass: true, reason: "ok" } },
      },
    };
    await writeCache(scenario, "claude", entry);
    const got = await readCache(scenario, "claude");
    assertEquals(got, entry);
  } finally {
    Deno.chdir(origCwd);
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("readCache: returns null on corrupt JSON", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  const origCwd = Deno.cwd();
  try {
    Deno.chdir(tmp);
    const scenario: BenchmarkScenario = {
      id: "corrupt",
      name: "C",
      pack: "p",
      sandboxState: { commits: [], expectedOutcome: "" },
      setup: () => Promise.resolve(),
      userQuery: "",
      agentsTemplateVars: { PROJECT_NAME: "X" },
      checklist: [],
    };
    const path = cacheFilePath(scenario, "claude");
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, "{ not json");
    const got = await readCache(scenario, "claude");
    assertEquals(got, null);
  } finally {
    Deno.chdir(origCwd);
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("readCache: returns null on schema mismatch", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  const origCwd = Deno.cwd();
  try {
    Deno.chdir(tmp);
    const scenario: BenchmarkScenario = {
      id: "schema-mismatch",
      name: "S",
      pack: "p",
      sandboxState: { commits: [], expectedOutcome: "" },
      setup: () => Promise.resolve(),
      userQuery: "",
      agentsTemplateVars: { PROJECT_NAME: "X" },
      checklist: [],
    };
    const path = cacheFilePath(scenario, "claude");
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify({ schema: 999, key: "x" }));
    const got = await readCache(scenario, "claude");
    assertEquals(got, null);
  } finally {
    Deno.chdir(origCwd);
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("trimResultForCache: truncates long judge reasons", () => {
  const longReason = "x".repeat(500);
  const r: BenchmarkResult = {
    scenarioId: "s",
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 0,
    tokensUsed: 0,
    totalCost: 0,
    toolCallsCount: 0,
    model: "m",
    checklistResults: {
      long: { pass: true, reason: longReason },
      short: { pass: true, reason: "ok" },
    },
    logs: "big",
  };
  const trimmed = trimResultForCache(r);
  assertEquals(trimmed.checklistResults.short.reason, "ok");
  const longTrimmed = trimmed.checklistResults.long.reason;
  assert(
    longTrimmed.length <= MAX_REASON_LEN,
    `reason length ${longTrimmed.length} > ${MAX_REASON_LEN}`,
  );
  assert(longTrimmed.endsWith("…"), "truncated reason must end with ellipsis");
});

Deno.test("trimResultForCache: drops fat fields (logs, evidence)", () => {
  const r = {
    scenarioId: "s",
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 0,
    tokensUsed: 0,
    totalCost: 0,
    toolCallsCount: 0,
    model: "m",
    checklistResults: {},
    logs: "some logs",
    evidence: "some evidence",
  } as BenchmarkResult;
  const trimmed = trimResultForCache(r);
  assert(!("logs" in trimmed));
  assert(!("evidence" in trimmed));
});

/**
 * FR-BENCH-ISOLATION — the cache key MUST include the adapter source so
 * that adding/changing the `prepareWorkspace` HOME-isolation behaviour
 * invalidates stale cached verdicts. Otherwise the first post-merge bench
 * run would re-use cached results computed with the old (broken) Skill
 * resolution.
 *
 * Verifies inclusion by injecting a temp marker file under
 * `scripts/benchmarks/lib/adapters/` (the adapter directory walked by the
 * `runner:` prefix) and asserting the key changes.
 */
Deno.test("isolation-key-change: cache key tracks adapter directory contents", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "cache-test-" });
  const adaptersDir = join(
    REPO_ROOT,
    "scripts",
    "benchmarks",
    "lib",
    "adapters",
  );
  // Use a non-.ts extension so the imports drift-guard parser does not
  // consume it concurrently. The walker in cache.ts is content-typeless.
  const markerPath = join(
    adaptersDir,
    `_isolation_key_marker_${crypto.randomUUID()}.bin`,
  );
  try {
    const scenario = await makeFakeScenario(tmp);
    const baseline = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });

    await Deno.writeTextFile(markerPath, "isolation-key-marker\n");
    const withMarker = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertNotEquals(
      baseline,
      withMarker,
      "Adding a file under adapters/ MUST change the cache key — adapter source is part of the runner: prefix walk.",
    );

    await Deno.remove(markerPath);
    const restored = await computeCacheKey({
      scenario,
      ide: "claude",
      agentModel: "m",
      runs: 1,
      ideCliVersion: "",
    });
    assertEquals(
      baseline,
      restored,
      "Removing the marker MUST restore the original cache key (proves no other state changed).",
    );
  } finally {
    try {
      await Deno.remove(markerPath);
    } catch (_) { /* already removed in happy path */ }
    await Deno.remove(tmp, { recursive: true });
  }
});

/**
 * Drift guard: if any file under scripts/benchmarks/lib/ gains a new
 * relative import that escapes `scripts/benchmarks/`, it MUST be added to
 * the whitelist in cache.ts. Otherwise cache keys silently miss the change.
 */
Deno.test("whitelist covers all cross-package imports from lib/", async () => {
  const libDir = fromFileUrl(new URL(".", import.meta.url));
  const benchRoot = dirname(libDir); // scripts/benchmarks
  const { whitelistedCrossPackageFiles } = await import("./cache.ts");
  const whitelist = new Set(
    whitelistedCrossPackageFiles.map((p) => join(REPO_ROOT, p)),
  );

  const { walk } = await import("@std/fs/walk");
  const importRe = /^\s*import\s+(?:[^"']*?from\s+)?["']([^"']+)["']/gm;

  const discovered = new Set<string>();
  for await (
    const entry of walk(libDir, {
      includeDirs: false,
      includeFiles: true,
      match: [/\.ts$/],
    })
  ) {
    if (entry.path.endsWith("_test.ts")) continue;
    const src = await Deno.readTextFile(entry.path);
    for (const m of src.matchAll(importRe)) {
      const spec = m[1];
      if (
        spec.startsWith("@std/") || spec.startsWith("jsr:") ||
        spec.startsWith("npm:") || spec.startsWith("node:") ||
        spec.startsWith("@bench/") ||
        spec.startsWith("@") && !spec.startsWith("@bench/")
      ) {
        continue;
      }
      if (!spec.startsWith(".")) continue; // bare non-std → treated as mapped
      const resolved = join(dirname(entry.path), spec);
      if (!resolved.startsWith(benchRoot)) {
        discovered.add(resolved);
      }
    }
  }

  for (const f of discovered) {
    assert(
      whitelist.has(f),
      `Cross-package import not covered by cache whitelist: ${
        relative(REPO_ROOT, f)
      }. Add it to whitelistedCrossPackageFiles in cache.ts.`,
    );
  }
});
