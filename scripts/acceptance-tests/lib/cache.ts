// [REF:fr:accept-cache | FR-ACCEPT-CACHE]
/**
 * Benchmark result cache — content-addressed, LOCAL (gitignored since 2026-08-04).
 *
 * ## Purpose
 *
 * Cut the cost and wall-time of `deno task bench` to ~0 for unchanged
 * primitives. Each (scenario, ide) slot stores the last known-good verdict
 * under `acceptance-tests/cache/<pack>/<scenario-id>/<ide>.json`. A re-run with an
 * unchanged cache key prints a `CACHED` line and does NOT spawn the agent or
 * judge CLIs. Any change to the input whitelist invalidates the slot.
 *
 * Mirrored in SRS (`FR-ACCEPT-CACHE`) and SDS §3.4.1.
 *
 * ## Cache-key algorithm (v2)
 *
 *   cacheKey = sha256(canonicalJSON({
 *     version:        CACHE_ALGORITHM_VERSION,   // 2 — bump on algo change
 *     scenarioId:     scenario.id,
 *     ide:            "claude" | "cursor" | "codex" | "opencode",
 *     ideCliVersion:  "" | stdout of `<cli> --version` (2s probe, empty on failure),
 *     agentModel:     "claude-sonnet-4-6" | ...,
 *     runs:           int,                       // bucketing for -n > 1
 *     acpLibVersion:  ACP_LIB_VERSION,           // ACP transport lib (sole transport)
 *     acpRegistry:    acpRegistryFingerprint(),  // hash of the ACP_AGENTS table
 *     inputs: sortedMap({
 *       "scenario:<relpath>":   fileHash(f) for f in scenario-dir (mod.ts + fixture/),
 *       "primitive:<relpath>":  fileHash(f) for f in primitive-dir, skipping acceptance-tests/,
 *       "pack.yaml":            fileHash(framework/<pack>/pack.yaml),
 *       "agents.template":      fileHash(framework/core/assets/AGENTS.template.md),
 *       "runner:<relpath>":     fileHash(f) for f in scripts/acceptance-tests/lib/**
 *                               (EXCLUDING *_test.ts) ∪ scripts/task-acceptance-tests.ts,
 *       "config:full":          fileHash(acceptance-tests/config.json),
 *     }),
 *   }))
 *
 * - `fileHash(path)` is the hex SHA-256 of the file's raw bytes. A missing
 *   file contributes nothing (no synthetic "empty" surprise).
 * - `canonicalJSON` uses sorted keys, recursively. No trailing whitespace.
 * - All `<relpath>` segments are relative to the repo root (Deno.cwd()),
 *   forward-slash separated, so keys are portable across macOS/Linux.
 *
 * ## Drift invariant
 *
 * If any file under `scripts/acceptance-tests/lib/` gains a new import that escapes
 * the lib directory, add its path to `whitelistedCrossPackageFiles` below.
 * `cache_test.ts` asserts this invariant — a missing entry fails the suite.
 *
 * ## What is intentionally NOT in the key
 *
 * - `logs`, `evidence`, `tokensUsed`, `totalCost` — runtime outputs, not
 *   inputs. These live in the cached result payload but are not hashed into
 *   the key.
 * - Host environment (OS, node version). Covered indirectly by runner code
 *   hashing + IDE CLI version.
 * - The harness's own unit tests (`scripts/acceptance-tests/lib/**\/*_test.ts`).
 *   They cannot change how a scenario executes. Until 2026-08-22 they were
 *   hashed, so editing one invalidated all 318 slots — 18 of the 50 files under
 *   lib/ are tests. Two tests in `cache_test.ts` pin both halves: a `_test.ts`
 *   file must not move the key, a non-test file under `adapters/` must.
 *
 * ## v1 → v2
 *
 * v2 excludes those unit tests and repairs the CLI entry-point path, which
 * named `scripts/task-bench.ts` — renamed away on 2026-05-11. A missing path
 * contributes nothing, so the file the sweep is launched from was in no key at
 * all while this header claimed it was. Both were found on 2026-08-22.
 */

import { dirname, join, relative } from "@std/path";
import { walk } from "@std/fs/walk";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import { ACP_LIB_VERSION, acpRegistryFingerprint } from "./acp/registry.ts";

/** Cache file payload schema. Bump when the on-disk shape changes. */
export const CACHE_SCHEMA_VERSION = 1;

/** Cache-key algorithm version. Bump on algorithmic change to invalidate all entries. */
export const CACHE_ALGORITHM_VERSION = 2;

/** Judge `reason` strings longer than this are truncated in the cache file. */
export const MAX_REASON_LEN = 200;

/**
 * Cross-package imports reached from `scripts/acceptance-tests/lib/**`.
 * Must be kept in sync with actual imports — enforced by `cache_test.ts`.
 */
export const whitelistedCrossPackageFiles: readonly string[] = [
  "scripts/utils.ts",
  // Places the sandbox outside the run dir (FR-ACCEPT-ISOLATION) — it decides
  // what the agent under test can reach, so a change to it can change verdicts.
  "scripts/benchmark/sandbox_root.ts",
];

/** Trimmed form of `BenchmarkResult` suitable for storing. */
export interface CachedResult {
  success: boolean;
  score: number;
  errorsCount: number;
  warningsCount: number;
  durationMs: number;
  tokensUsed: number;
  totalCost: number;
  toolCallsCount: number;
  model: string;
  checklistResults: Record<string, { pass: boolean; reason: string }>;
}

/** On-disk cache entry. */
export interface CacheEntry {
  schema: typeof CACHE_SCHEMA_VERSION;
  key: string;
  scenarioId: string;
  ide: string;
  agentModel: string;
  recordedAt: string;
  result: CachedResult;
}

/** Inputs that materialize a cache key. */
export interface CacheKeyInputs {
  scenario: BenchmarkScenario;
  ide: string;
  agentModel: string;
  runs: number;
  /** Best-effort output of `<cli> --version`, or `""` on probe failure. */
  ideCliVersion: string;
}

/**
 * Builds the `inputs` map that goes into the cache key: `<prefix>:<relpath> →
 * sha-256 of the file's bytes`, sorted by construction.
 *
 * Exported so a test can assert WHICH files are in the key rather than only
 * that some key changed. Asserting membership directly is what caught the
 * `scripts/task-bench.ts` path, dead since the 2026-05-11 rename and silently
 * skipped ever since, so the CLI entry point was in no key at all.
 *
 * Missing input files (absent fixture dir, unknown pack, etc.) are silently
 * skipped so the key stays stable rather than throwing.
 */
export async function computeCacheKeyInputs(
  inputs: CacheKeyInputs,
): Promise<Record<string, string>> {
  const { scenario } = inputs;
  const hashInputs: Record<string, string> = {};

  // 1. Scenario directory (mod.ts + fixture/)
  if (scenario.fixturePath) {
    const scenarioDir = dirname(scenario.fixturePath);
    await hashDirectoryInto(scenarioDir, "scenario", hashInputs);
  }

  // 2. Primitive directory (SKILL.md / agent.md + siblings). Skip benchmarks/
  //    to avoid double-hashing scenario content and to avoid cross-talk
  //    between unrelated sibling scenarios.
  if (scenario.targetAgentPath) {
    const primitiveDir = dirname(scenario.targetAgentPath);
    await hashDirectoryInto(primitiveDir, "primitive", hashInputs, [
      "acceptance-tests",
    ]);
  }

  // 3. pack.yaml
  if (scenario.pack) {
    await hashFileInto(
      join("framework", scenario.pack, "pack.yaml"),
      "pack.yaml",
      hashInputs,
    );
  }

  // 4. AGENTS.template.md (runtime template rendered by runner.ts).
  await hashFileInto(
    join("framework", "core", "assets", "AGENTS.template.md"),
    "agents.template",
    hashInputs,
  );

  // 5. Runner code: scripts/acceptance-tests/lib/** + the CLI entry point.
  //    The harness's OWN unit tests are excluded — they decide nothing about
  //    how a scenario executes, and hashing them made one edit to
  //    `process_watchdog_test.ts` invalidate all 318 slots (2026-08-22).
  await hashDirectoryInto(
    join("scripts", "acceptance-tests", "lib"),
    "runner",
    hashInputs,
    [],
    [/_test\.ts$/],
  );
  await hashFileInto(
    join("scripts", "task-acceptance-tests.ts"),
    "runner",
    hashInputs,
  );

  // 6. Cross-package imports from lib/ — enumerated explicitly.
  for (const rel of whitelistedCrossPackageFiles) {
    await hashFileInto(rel, "cli", hashInputs);
  }

  // 7. Full acceptance-tests/config.json (agent model, judge model, temperature).
  await hashFileInto(
    join("acceptance-tests", "config.json"),
    "config",
    hashInputs,
  );

  return hashInputs;
}

/**
 * Computes the cache key for a scenario run under the specified options.
 */
export async function computeCacheKey(
  inputs: CacheKeyInputs,
): Promise<string> {
  const { scenario, ide, agentModel, runs, ideCliVersion } = inputs;
  const payload = canonicalize({
    version: CACHE_ALGORITHM_VERSION,
    scenarioId: scenario.id,
    ide,
    ideCliVersion,
    agentModel,
    runs,
    // ACP is the only transport. Its lib version + agent-spec table enter every
    // key, so an ACP lib upgrade or a registry edit invalidates stale verdicts.
    acpLibVersion: ACP_LIB_VERSION,
    acpRegistry: acpRegistryFingerprint(),
    inputs: await computeCacheKeyInputs(inputs),
  });

  return await sha256Hex(payload);
}

/** Absolute path of the cache file for `(scenario, ide)`. */
export function cacheFilePath(
  scenario: BenchmarkScenario,
  ide: string,
): string {
  const pack = scenario.pack ?? "unknown";
  return join(
    Deno.cwd(),
    "acceptance-tests",
    "cache",
    pack,
    scenario.id,
    `${ide}.json`,
  );
}

/**
 * Reads the cache slot for `(scenario, ide)`. Returns `null` on any failure
 * (missing file, corrupt JSON, schema mismatch) — callers treat null as a
 * cache miss.
 */
export async function readCache(
  scenario: BenchmarkScenario,
  ide: string,
): Promise<CacheEntry | null> {
  const path = cacheFilePath(scenario, ide);
  let raw: string;
  try {
    raw = await Deno.readTextFile(path);
  } catch (_) {
    return null;
  }
  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry?.schema !== CACHE_SCHEMA_VERSION) return null;
    if (typeof entry.key !== "string" || entry.key.length === 0) return null;
    return entry;
  } catch (_) {
    return null;
  }
}

/** Writes a cache entry to disk. Creates parent directories as needed. */
export async function writeCache(
  scenario: BenchmarkScenario,
  ide: string,
  entry: CacheEntry,
): Promise<void> {
  const path = cacheFilePath(scenario, ide);
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, JSON.stringify(entry, null, 2) + "\n");
}

/** Projects a `BenchmarkResult` onto the stored `CachedResult` shape. */
export function trimResultForCache(r: BenchmarkResult): CachedResult {
  const checklistResults: CachedResult["checklistResults"] = {};
  for (const [id, v] of Object.entries(r.checklistResults)) {
    checklistResults[id] = { pass: v.pass, reason: truncate(v.reason) };
  }
  return {
    success: r.success,
    score: r.score,
    errorsCount: r.errorsCount,
    warningsCount: r.warningsCount,
    durationMs: r.durationMs,
    tokensUsed: r.tokensUsed,
    totalCost: r.totalCost,
    toolCallsCount: r.toolCallsCount,
    model: r.model,
    checklistResults,
  };
}

/** Reconstructs a minimal `BenchmarkResult` from a cache entry for summary printing. */
export function resultFromCache(
  scenario: BenchmarkScenario,
  entry: CacheEntry,
): BenchmarkResult {
  return {
    scenarioId: scenario.id,
    success: entry.result.success,
    score: entry.result.score,
    errorsCount: entry.result.errorsCount,
    warningsCount: entry.result.warningsCount,
    durationMs: entry.result.durationMs,
    tokensUsed: entry.result.tokensUsed,
    totalCost: entry.result.totalCost,
    toolCallsCount: entry.result.toolCallsCount,
    model: entry.result.model,
    checklistResults: entry.result.checklistResults,
    logs: "(cached)",
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function truncate(s: string): string {
  if (s.length <= MAX_REASON_LEN) return s;
  // Reserve 1 char for the ellipsis marker so the total stays within the cap.
  return s.slice(0, MAX_REASON_LEN - 1) + "…";
}

async function hashFileInto(
  path: string,
  prefix: string,
  out: Record<string, string>,
): Promise<void> {
  try {
    const data = await Deno.readFile(path);
    out[`${prefix}:${normalize(path)}`] = await sha256HexBytes(data);
  } catch (_) {
    // Missing file → contributes nothing.
  }
}

async function hashDirectoryInto(
  dir: string,
  prefix: string,
  out: Record<string, string>,
  skipDirs: string[] = [],
  skipFiles: RegExp[] = [],
): Promise<void> {
  try {
    const stat = await Deno.stat(dir);
    if (!stat.isDirectory) return;
  } catch (_) {
    return; // Missing directory → contributes nothing.
  }

  const skipPatterns = [
    ...skipDirs.map((d) => new RegExp(`(^|/)${escapeRegExp(d)}(/|$)`)),
    ...skipFiles,
  ];

  const found: { rel: string; abs: string }[] = [];
  for await (
    const entry of walk(dir, {
      includeDirs: false,
      includeFiles: true,
      followSymlinks: false,
      skip: skipPatterns,
    })
  ) {
    const rel = normalize(relative(Deno.cwd(), entry.path));
    found.push({ rel, abs: entry.path });
  }
  found.sort((a, b) => a.rel.localeCompare(b.rel));
  for (const f of found) {
    const data = await Deno.readFile(f.abs);
    out[`${prefix}:${f.rel}`] = await sha256HexBytes(data);
  }
}

function normalize(p: string): string {
  return p.replaceAll("\\", "/");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recursive JSON canonicalization: keys sorted at every level, deterministic
 * stringification. Arrays keep their order. Primitives use `JSON.stringify`.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") +
    "}";
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  return await sha256HexBytes(bytes);
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  // Re-wrap into a fresh ArrayBuffer view so SubtleCrypto's BufferSource
  // constraint is satisfied (Deno types reject SharedArrayBuffer-backed views).
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const view = new Uint8Array(digest);
  let out = "";
  for (const b of view) out += b.toString(16).padStart(2, "0");
  return out;
}
