/**
 * Pre-run cache lookup + post-run cache writer for the bench command.
 * [FR-ACCEPT-CACHE](../../../documents/requirements.md#fr-bench-cache-benchmark-result-cache)
 */
import { relative } from "@std/path";
import { ansi } from "../../utils.ts";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import {
  CACHE_SCHEMA_VERSION,
  type CacheEntry,
  cacheFilePath,
  computeCacheKey,
  readCache,
  resultFromCache,
  trimResultForCache,
  writeCache,
} from "./cache.ts";

export interface CacheFlags {
  noCache: boolean;
  refreshCache: boolean;
  cacheCheck: boolean;
  cacheWithRuns: boolean;
}

export interface CachePrecheck {
  scenariosPendingExec: BenchmarkScenario[];
  cachedScenarioIds: Set<string>;
  scenarioCacheKeys: Map<string, string>;
  cacheCheckMissed: boolean;
  cachedResults: BenchmarkResult[];
  cacheReadEnabled: boolean;
  cacheWriteEnabled: boolean;
}

/**
 * Pre-check the committed result cache for each scenario. Returns the list
 * still requiring execution + cached results to merge into the final report.
 * Cache participation: bypassed when --no-cache is set, or when -n > 1
 * without --cache-with-runs (multi-run is a statistical probe by design).
 */
export async function precheckCache(
  scenariosToRun: BenchmarkScenario[],
  cacheFlags: CacheFlags,
  runs: number,
  ide: string,
  agentModel: string,
  ideCliVersion: string,
): Promise<CachePrecheck> {
  const cacheEligibleForRuns = runs === 1 || cacheFlags.cacheWithRuns;
  const cacheEnabled = !cacheFlags.noCache && cacheEligibleForRuns;
  const cacheWriteEnabled = cacheEnabled && !cacheFlags.cacheCheck;
  const cacheReadEnabled = cacheEnabled && !cacheFlags.refreshCache;

  const out: CachePrecheck = {
    scenariosPendingExec: [],
    cachedScenarioIds: new Set(),
    scenarioCacheKeys: new Map(),
    cacheCheckMissed: false,
    cachedResults: [],
    cacheReadEnabled,
    cacheWriteEnabled,
  };

  for (const scenario of scenariosToRun) {
    if (!cacheEnabled || scenario.skip) {
      out.scenariosPendingExec.push(scenario);
      continue;
    }
    const key = await computeCacheKey({
      scenario,
      ide,
      agentModel,
      runs,
      ideCliVersion,
    });
    out.scenarioCacheKeys.set(scenario.id, key);

    if (cacheReadEnabled) {
      const entry = await readCache(scenario, ide);
      if (entry && entry.key === key) {
        out.cachedScenarioIds.add(scenario.id);
        out.cachedResults.push(resultFromCache(scenario, entry));
        const cachePath = cacheFilePath(scenario, ide);
        console.log(
          `  ${ansi("\x1b[32m")}[CACHED]${
            ansi("\x1b[0m")
          } ${scenario.id} (recorded ${entry.recordedAt}, key ${
            key.slice(0, 12)
          }…) — ${relative(Deno.cwd(), cachePath)}`,
        );
        continue;
      }
    }

    if (cacheFlags.cacheCheck) {
      console.error(`CACHE-MISS: ${scenario.id}`);
      out.cacheCheckMissed = true;
      continue;
    }

    out.scenariosPendingExec.push(scenario);
  }
  return out;
}

/**
 * Per-scenario streaming cache write: track remaining runs and collected
 * results so that the cache entry is written immediately after the LAST run
 * of a scenario completes (instead of batched at the end). Writes only
 * when all N runs passed.
 */
export async function maybeWriteScenarioCache(
  scenario: BenchmarkScenario,
  ctx: {
    cacheWriteEnabled: boolean;
    cachedScenarioIds: Set<string>;
    runResults: Map<string, BenchmarkResult[]>;
    runs: number;
    scenarioCacheKeys: Map<string, string>;
    adapter: { ide: string };
    agentModel: string;
  },
): Promise<void> {
  if (!ctx.cacheWriteEnabled) return;
  if (scenario.skip) return;
  if (ctx.cachedScenarioIds.has(scenario.id)) return;
  const scenarioResults = ctx.runResults.get(scenario.id) ?? [];
  if (scenarioResults.length === 0) return;
  if (scenarioResults.length !== ctx.runs) return;
  if (!scenarioResults.every((r) => r.success)) return;
  const key = ctx.scenarioCacheKeys.get(scenario.id);
  if (!key) return;
  const entry: CacheEntry = {
    schema: CACHE_SCHEMA_VERSION,
    key,
    scenarioId: scenario.id,
    ide: ctx.adapter.ide,
    agentModel: ctx.agentModel,
    recordedAt: new Date().toISOString(),
    result: trimResultForCache(scenarioResults[0]),
  };
  try {
    await writeCache(scenario, ctx.adapter.ide, entry);
    const cachePath = cacheFilePath(scenario, ctx.adapter.ide);
    console.log(
      `  ${ansi("\x1b[32m")}[CACHE WRITE]${ansi("\x1b[0m")} ${scenario.id} — ${
        relative(Deno.cwd(), cachePath)
      }`,
    );
  } catch (e) {
    console.warn(
      `  Warning: failed to write cache for ${scenario.id}: ${
        e instanceof Error ? e.message : e
      }`,
    );
  }
}
