/**
 * task-bench.ts — Discovers and runs agent benchmark scenarios.
 *
 * Walks `framework/<pack>/skills/<skill>/benchmarks/`,
 * `framework/<pack>/commands/<command>/benchmarks/`, and
 * `framework/<pack>/agents/<agent>/benchmarks/` for scenario mod.ts files.
 * Runs each through the benchmark runner with LLM-Judge evaluation, and
 * outputs results as console summary + HTML report.
 *
 * Usage: deno task bench [-f filter] [-m model] [-i ide] [-n runs]
 */
import { dirname, join, relative } from "@std/path";
import { type Args, parse } from "@std/flags";
import { existsSync, walk } from "@std/fs";
import { ansi } from "./utils.ts";
import type {
  BenchmarkResult,
  BenchmarkScenario,
} from "./benchmarks/lib/types.ts";
import { runScenario } from "./benchmarks/lib/runner.ts";
import {
  type BenchmarkConfig,
  getIdeConfig,
  loadConfig,
  type ModelConfig,
} from "./benchmarks/lib/llm.ts";
import {
  type AgentAdapter,
  createAdapter,
  SUPPORTED_IDES,
} from "./benchmarks/lib/adapters/mod.ts";
import { TraceLogger } from "./benchmarks/lib/trace.ts";
import {
  CACHE_SCHEMA_VERSION,
  type CacheEntry,
  cacheFilePath,
  computeCacheKey,
  readCache,
  resultFromCache,
  trimResultForCache,
  writeCache,
} from "./benchmarks/lib/cache.ts";

/**
 * Imports benchmark scenario modules from a directory tree.
 * Looks for mod.ts files inside benchmarks/ subdirectories.
 */
async function importScenariosFromDir(
  dir: string,
  packName: string,
  scenarios: BenchmarkScenario[],
): Promise<void> {
  if (!existsSync(dir)) return;

  for await (
    const entry of walk(dir, {
      maxDepth: 10,
      includeFiles: true,
      match: [/mod\.ts$/],
    })
  ) {
    if (
      !entry.path.includes("/benchmarks/") ||
      entry.path.includes("/fixture/")
    ) {
      continue;
    }
    try {
      const module = await import(`file://${entry.path}`);
      for (const exportName in module) {
        const value = module[exportName];
        if (
          value && typeof value === "object" && "id" in value &&
          "userQuery" in value
        ) {
          const scenario = value as BenchmarkScenario;
          if (!scenario.fixturePath) {
            scenario.fixturePath = join(dirname(entry.path), "fixture");
          }
          scenario.pack = packName;
          scenarios.push(scenario);
        }
      }
    } catch (e) {
      console.warn(
        `  Warning: Failed to import scenario from ${entry.path}: ${e}`,
      );
    }
  }
}

/**
 * Walks `framework/<pack>/skills/`, `framework/<pack>/commands/`,
 * `framework/<pack>/agents/`, and `framework/<pack>/benchmarks/` for
 * benchmark scenario mod.ts files.
 */
async function discoverScenarios(): Promise<BenchmarkScenario[]> {
  const scenarios: BenchmarkScenario[] = [];
  const frameworkDir = join(Deno.cwd(), "framework");

  if (!existsSync(frameworkDir)) {
    return scenarios;
  }

  for await (const packEntry of Deno.readDir(frameworkDir)) {
    if (!packEntry.isDirectory) continue;

    // Discover skill benchmarks: framework/<pack>/skills/<skill>/benchmarks/*/mod.ts
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "skills"),
      packEntry.name,
      scenarios,
    );

    // Discover command benchmarks: framework/<pack>/commands/<command>/benchmarks/*/mod.ts
    // Commands are sibling primitives to skills; their benchmarks live
    // under commands/<name>/benchmarks/ and must be discovered too.
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "commands"),
      packEntry.name,
      scenarios,
    );

    // Discover agent benchmarks: framework/<pack>/agents/<agent>/benchmarks/*/mod.ts
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "agents"),
      packEntry.name,
      scenarios,
    );

    // Discover pack-level benchmarks: framework/<pack>/benchmarks/*/mod.ts
    await importScenariosFromDir(
      join(frameworkDir, packEntry.name, "benchmarks"),
      packEntry.name,
      scenarios,
    );
  }

  return scenarios;
}

/** Prints CLI usage information with available options. */
function printHelp(defaultAgentModel: string) {
  console.log(`
Usage: deno task bench [options]

Options:
  -f, --filter <string>        Filter scenarios by ID (substring match)
  -m, --model <string>         Agent model to use (default: ${defaultAgentModel})
  -i, --ide <string>           IDE adapter to use (${
    SUPPORTED_IDES.join(", ")
  }) (default: from config)
  -n, --runs <number>          Number of runs per scenario (default: 1)
  -s, --skill-override <name>  Override skill name in filtered scenarios (A/B testing)
  -p, --parallel <number>      Max concurrent scenarios (default: 1, sequential)
  --lock <string>              Custom lock file name (default: benchmarks.lock)
  --no-cache                   Bypass the committed result cache (no read, no write)
  --refresh-cache              Always run; overwrite cache on success
  --cache-check                Exit non-zero on any cache miss (CI gate)
  --cache-with-runs            Opt-in to caching when -n > 1 (default: bypass)
  --help                       Show this help message
  `);
}

/** Parses CLI args and applies cache-flag validation rules. Exits on
 * validation errors, --help, or unexpected positional args. */
function parseAndValidateArgs(): Args {
  const args = parse(Deno.args, {
    string: [
      "filter",
      "runs",
      "model",
      "ide",
      "parallel",
      "lock",
      "skill-override",
    ],
    boolean: [
      "help",
      "no-cache",
      "refresh-cache",
      "cache-check",
      "cache-with-runs",
    ],
    alias: {
      f: "filter",
      n: "runs",
      s: "skill-override",
      h: "help",
      m: "model",
      i: "ide",
      p: "parallel",
    },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        console.error(`Unknown argument: ${arg}`);
        printHelp("<per IDE>");
        Deno.exit(1);
      }
      return true;
    },
  });

  // Cache-mode flags are mutually exclusive: picking two contradicts intent.
  const modeFlags = [
    ["--no-cache", args["no-cache"]] as const,
    ["--refresh-cache", args["refresh-cache"]] as const,
    ["--cache-check", args["cache-check"]] as const,
  ].filter(([, on]) => !!on).map(([n]) => n);
  if (modeFlags.length > 1) {
    console.error(`Mutually exclusive cache flags: ${modeFlags.join(", ")}`);
    Deno.exit(1);
  }
  const runsCount = parseInt(args.runs || "1", 10);
  if (args["cache-check"] && runsCount > 1 && !args["cache-with-runs"]) {
    console.error(
      `--cache-check with -n > 1 requires --cache-with-runs (otherwise the cache is bypassed and every scenario is a miss).`,
    );
    Deno.exit(1);
  }

  if (args.help) {
    printHelp("<per IDE>");
    Deno.exit(0);
  }

  if (args._.length > 0) {
    console.error(`Unexpected positional arguments: ${args._.join(", ")}`);
    printHelp("<per IDE>");
    Deno.exit(1);
  }

  return args;
}

/** Acquire the per-process benchmark lock. Exits 1 on existing lock. Sets up
 * `unload`/SIGINT/SIGTERM handlers to remove the lock on shutdown. */
async function acquireBenchmarkLock(lockFile: string): Promise<void> {
  if (existsSync(lockFile)) {
    const pid = await Deno.readTextFile(lockFile).catch(() => "unknown");
    console.error(
      `${
        ansi("\x1b[31m")
      }Error: Another benchmark process (PID: ${pid}) is already running.${
        ansi("\x1b[0m")
      }`,
    );
    Deno.exit(1);
  }

  await Deno.mkdir(join(Deno.cwd(), "benchmarks"), { recursive: true });
  await Deno.writeTextFile(lockFile, Deno.pid.toString());

  const cleanup = () => {
    try {
      Deno.removeSync(lockFile);
    } catch {
      // Ignore if already removed
    }
  };

  globalThis.addEventListener("unload", cleanup);
  Deno.addSignalListener("SIGINT", () => {
    cleanup();
    Deno.exit(130);
  });
  Deno.addSignalListener("SIGTERM", () => {
    cleanup();
    Deno.exit(143);
  });
}

/** Apply --filter and --skill-override to the discovered scenario set. */
function selectScenarios(
  allScenarios: BenchmarkScenario[],
  filter: string | undefined,
  skillOverride: string | undefined,
): BenchmarkScenario[] {
  let scenariosToRun = filter
    ? allScenarios.filter((s) => s.id.includes(String(filter)))
    : allScenarios;

  // Apply skill override: repoint filtered scenarios to a different skill.
  // Useful for A/B testing (e.g., run flowai-commit benchmarks against flowai-commit-beta).
  if (skillOverride) {
    scenariosToRun = scenariosToRun
      .filter((s) => s.skill) // only skill-based scenarios
      .map((s) => {
        const originalSkill = s.skill!;
        // Shallow-clone to avoid mutating the original scenario object
        const clone = Object.create(
          Object.getPrototypeOf(s),
          Object.getOwnPropertyDescriptors(s),
        ) as typeof s;
        clone.skill = skillOverride;
        clone.id = s.id.replace(originalSkill, skillOverride);
        clone.userQuery = s.userQuery.replace(
          `/${originalSkill}`,
          `/${skillOverride}`,
        );
        return clone;
      });
    console.log(
      `Skill override: ${
        scenariosToRun[0]?.skill ?? "?"
      } (original skill replaced in ${scenariosToRun.length} scenarios)`,
    );
  }
  return scenariosToRun;
}

interface CachePrecheck {
  scenariosPendingExec: BenchmarkScenario[];
  cachedScenarioIds: Set<string>;
  scenarioCacheKeys: Map<string, string>;
  cacheCheckMissed: boolean;
  cachedResults: BenchmarkResult[];
  cacheReadEnabled: boolean;
  cacheWriteEnabled: boolean;
}

interface CacheFlags {
  noCache: boolean;
  refreshCache: boolean;
  cacheCheck: boolean;
  cacheWithRuns: boolean;
}

/**
 * [FR-BENCH-CACHE](../documents/requirements.md#fr-bench-cache-benchmark-result-cache)
 * Pre-check the committed result cache for each scenario. Returns the list
 * still requiring execution + cached results to merge into the final report.
 * Cache participation: bypassed when --no-cache is set, or when -n > 1
 * without --cache-with-runs (multi-run is a statistical probe by design).
 */
async function precheckCache(
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

interface ExecutionContext {
  results: BenchmarkResult[];
  runDir: string;
  runs: number;
  agentModel: string;
  judgeConfig: ModelConfig;
  adapter: AgentAdapter;
  tracer: TraceLogger;
  scenarioCacheKeys: Map<string, string>;
  cachedScenarioIds: Set<string>;
  cacheWriteEnabled: boolean;
  remainingRuns: Map<string, number>;
  runResults: Map<string, BenchmarkResult[]>;
  totals: { totalCostAll: number };
}

/**
 * Per-scenario streaming cache write: track remaining runs and collected
 * results so that the cache entry is written immediately after the LAST run
 * of a scenario completes (instead of batched at the end). Writes only
 * when all N runs passed.
 */
async function maybeWriteScenarioCache(
  scenario: BenchmarkScenario,
  ctx: ExecutionContext,
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

/** Print the per-checklist line items for a single run with color coding. */
function printChecklistResults(
  result: BenchmarkResult,
  scenario: BenchmarkScenario,
): void {
  for (const [id, res] of Object.entries(result.checklistResults)) {
    const item = scenario.checklist.find((i) => i.id === id);
    const isCritical = item?.critical ?? true;

    let color = ansi("\x1b[32m"); // Green
    let mark = "x";
    let label = "";

    if (!res.pass) {
      if (isCritical) {
        color = ansi("\x1b[31m"); // Red
        mark = " ";
        label = " (ERROR)";
      } else {
        color = ansi("\x1b[33m"); // Yellow
        mark = "!";
        label = " (WARNING)";
      }
    }

    const dim = ansi("\x1b[2m");
    const reset = ansi("\x1b[0m");
    console.log(
      `    ${color}[${mark}] ${id}${label}:${reset} ${dim}${res.reason}${reset}`,
    );
  }
}

/** Executes a single scenario run, prints checklist results, and accumulates costs. */
async function executeTask(
  task: { scenario: BenchmarkScenario; runIndex: number },
  ctx: ExecutionContext,
): Promise<void> {
  const { scenario, runIndex } = task;
  if (ctx.runs > 1) {
    console.log(`\n--- Run ${runIndex}/${ctx.runs} for ${scenario.id} ---`);
  }
  const scenarioWorkDir = join(ctx.runDir, scenario.id, `run-${runIndex}`);
  try {
    const result = await runScenario(scenario, {
      agentModel: ctx.agentModel,
      judgeConfig: ctx.judgeConfig,
      workDir: scenarioWorkDir,
      adapter: ctx.adapter,
      tracer: ctx.tracer,
      runIndex,
    });
    ctx.results.push(result);
    ctx.totals.totalCostAll += result.totalCost;
    ctx.runResults.get(scenario.id)?.push(result);

    const statusLabel = result.success ? "PASSED" : "FAILED";
    console.log(
      `  Result: ${statusLabel} (Errors: ${result.errorsCount}, Warnings: ${result.warningsCount}) Cost: $${
        result.totalCost.toFixed(6)
      }`,
    );
    console.log("  Checklist:");
    printChecklistResults(result, scenario);

    if (!result.success) {
      const reportPath = join(ctx.runDir, "report.html");
      console.log(
        `\n  ${ansi("\x1b[31m")}See trace for details: file://${reportPath}${
          ansi("\x1b[0m")
        }\n`,
      );
    }
  } catch (e) {
    console.error(`  Error running scenario ${scenario.id}:`, e);
  } finally {
    const remaining = (ctx.remainingRuns.get(scenario.id) ?? 0) - 1;
    ctx.remainingRuns.set(scenario.id, remaining);
    if (remaining === 0) {
      await maybeWriteScenarioCache(scenario, ctx);
    }
  }
}

/** Run all tasks honoring `--parallel`. Sequential when parallel ≤ 1. */
async function runTasks(
  tasks: { scenario: BenchmarkScenario; runIndex: number }[],
  parallel: number,
  ctx: ExecutionContext,
): Promise<void> {
  if (parallel <= 1) {
    for (const task of tasks) {
      await executeTask(task, ctx);
    }
    return;
  }

  // Parallel mode with semaphore
  let running = 0;
  let taskIndex = 0;
  const errors: Error[] = [];

  await new Promise<void>((resolve) => {
    function scheduleNext() {
      while (running < parallel && taskIndex < tasks.length) {
        const task = tasks[taskIndex++];
        running++;
        executeTask(task, ctx).catch((e) => {
          errors.push(e instanceof Error ? e : new Error(String(e)));
        }).finally(() => {
          running--;
          if (taskIndex >= tasks.length && running === 0) {
            resolve();
          } else {
            scheduleNext();
          }
        });
      }
      if (tasks.length === 0) resolve();
    }
    scheduleNext();
  });

  if (errors.length > 0) {
    console.error(`\n${errors.length} task(s) failed with errors.`);
  }
}

/** Print the trailing detailed errors & warnings block. */
function printDetailedErrors(
  results: BenchmarkResult[],
  allScenarios: BenchmarkScenario[],
): void {
  const failedResults = results.filter((r) =>
    r.errorsCount > 0 || r.warningsCount > 0
  );
  if (failedResults.length === 0) return;

  console.log("\n--- DETAILED ERRORS & WARNINGS ---");
  for (const r of failedResults) {
    const scenario = allScenarios.find((s) => s.id === r.scenarioId);
    console.log(
      `\nScenario: ${scenario?.name || r.scenarioId} (${r.scenarioId})`,
    );
    for (const [id, res] of Object.entries(r.checklistResults)) {
      if (!res.pass) {
        const item = scenario?.checklist.find((i) => i.id === id);
        const isCritical = item?.critical ?? true;
        const color = isCritical ? ansi("\x1b[31m") : ansi("\x1b[33m");
        const label = isCritical ? "ERROR" : "WARNING";
        const dim = ansi("\x1b[2m");
        const reset = ansi("\x1b[0m");
        console.log(
          `  ${color}[${label}] ${id}:${reset} ${dim}${res.reason}${reset}`,
        );
      }
    }
  }
}

/** Print the per-scenario summary table + TOTAL row. */
function printSummaryTable(
  results: BenchmarkResult[],
  totalCostAll: number,
): void {
  console.log("\n--- SUMMARY ---");
  console.log(
    `${"ID".padEnd(30)} | ${"Model".padEnd(30)} | ${"Err".padStart(3)} | ${
      "Wrn".padStart(3)
    } | ${"Steps".padStart(6)} | ${"Time (s)".padStart(10)} | ${
      "Tokens".padStart(12)
    } | ${"Cost ($)".padStart(10)}`,
  );
  console.log("-".repeat(130));

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalSteps = 0;
  let totalTimeMs = 0;
  let totalTokens = 0;

  for (const r of results) {
    totalErrors += r.errorsCount;
    totalWarnings += r.warningsCount;
    totalSteps += r.toolCallsCount;
    totalTimeMs += r.durationMs;
    totalTokens += r.tokensUsed;

    const nameColor = r.errorsCount > 0
      ? ansi("\x1b[31m")
      : (r.warningsCount > 0 ? ansi("\x1b[33m") : ansi("\x1b[32m"));
    const errColor = r.errorsCount > 0 ? ansi("\x1b[31m") : "";
    const wrnColor = r.warningsCount > 0 ? ansi("\x1b[33m") : "";
    const reset = ansi("\x1b[0m");

    const formattedTokens = r.tokensUsed.toString().replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " ",
    );

    console.log(
      `${nameColor}${r.scenarioId.padEnd(30)}${reset} | ${
        r.model.padEnd(30)
      } | ${errColor}${
        r.errorsCount.toString().padStart(3)
      }${reset} | ${wrnColor}${
        r.warningsCount.toString().padStart(3)
      }${reset} | ${r.toolCallsCount.toString().padStart(6)} | ${
        (r.durationMs / 1000).toFixed(1).padStart(10)
      } | ${formattedTokens.padStart(12)} | $${
        r.totalCost.toFixed(6).padStart(10)
      }`,
    );
  }

  console.log("-".repeat(130));
  const totalTokensFormatted = totalTokens.toString().replace(
    /\B(?=(\d{3})+(?!\d))/g,
    " ",
  );
  console.log(
    `${"TOTAL".padEnd(30)} | ${"".padEnd(30)} | ${
      totalErrors.toString().padStart(3)
    } | ${totalWarnings.toString().padStart(3)} | ${
      totalSteps.toString().padStart(6)
    } | ${(totalTimeMs / 1000).toFixed(1).padStart(10)} | ${
      totalTokensFormatted.padStart(12)
    } | $${totalCostAll.toFixed(6).padStart(10)}`,
  );
  console.log("-".repeat(130));
}

/** Print the per-scenario PASS RATES block. Only meaningful when runs > 1. */
function printPassRates(
  results: BenchmarkResult[],
  scenariosToRun: BenchmarkScenario[],
  runs: number,
): void {
  const threshold = Math.ceil(runs / 2);
  console.log(`\n--- PASS RATES (threshold: ${threshold}/${runs}) ---`);
  for (const scenario of scenariosToRun) {
    const scenarioResults = results.filter((r) => r.scenarioId === scenario.id);
    const passed = scenarioResults.filter((r) => r.success).length;
    const rate = (passed / runs) * 100;
    const ok = passed >= threshold;
    const color = ok ? ansi("\x1b[32m") : ansi("\x1b[31m");
    const mark = ok ? "PASS" : "FAIL";
    const reset = ansi("\x1b[0m");
    console.log(
      `${color}[${mark}]${reset} ${scenario.id.padEnd(30)}: ${
        rate.toFixed(1)
      }% (${passed}/${runs})`,
    );
  }
}

/**
 * Compute overall failure status. With multiple runs: scenario passes if
 * >50% of runs succeed. With single run: scenario passes if it succeeds.
 */
function hasAnyFailures(
  results: BenchmarkResult[],
  scenariosToRun: BenchmarkScenario[],
  runs: number,
): boolean {
  if (runs > 1) {
    for (const scenario of scenariosToRun) {
      const scenarioResults = results.filter((r) =>
        r.scenarioId === scenario.id
      );
      const passed = scenarioResults.filter((r) => r.success).length;
      if (passed < Math.ceil(runs / 2)) return true;
    }
    return false;
  }
  return results.some((r) => !r.success);
}

interface RuntimeSetup {
  adapter: AgentAdapter;
  agentModel: string;
  judgeConfig: ModelConfig;
  filter: string | undefined;
  runs: number;
  parallel: number;
  skillOverride: string | undefined;
  cacheFlags: CacheFlags;
}

/** Assemble runtime setup from parsed args + bench config. */
function buildRuntimeSetup(args: Args, config: BenchmarkConfig): RuntimeSetup {
  const ideName = args.ide || config.default_ides[0];
  const adapter = createAdapter(ideName);
  const ideConfig = getIdeConfig(config, ideName);
  const agentModel = args.model || ideConfig.default_agent_model;
  const judgeConfig: ModelConfig = { ...ideConfig.judge };

  return {
    adapter,
    agentModel,
    judgeConfig,
    filter: args.filter,
    runs: parseInt(args.runs || "1", 10),
    parallel: parseInt(args.parallel || "1", 10),
    skillOverride: args["skill-override"] as string | undefined,
    cacheFlags: {
      noCache: !!args["no-cache"],
      refreshCache: !!args["refresh-cache"],
      cacheCheck: !!args["cache-check"],
      cacheWithRuns: !!args["cache-with-runs"],
    },
  };
}

/** Replace `benchmarks/runs/latest` symlink with the current run directory. */
async function updateLatestSymlink(runDir: string): Promise<void> {
  const latestLink = join(Deno.cwd(), "benchmarks", "runs", "latest");
  try {
    await Deno.remove(latestLink);
  } catch {
    // ignore if doesn't exist
  }
  await Deno.symlink(runDir, latestLink);
}

/** Echo the resolved runtime header (IDE, models, runs, parallelism). */
function printRunHeader(setup: RuntimeSetup, scenarioCount: number): void {
  console.log(`Found ${scenarioCount} scenarios.`);
  console.log(`Using IDE: ${setup.adapter.ide}`);
  console.log(`Using agent model: ${setup.agentModel}`);
  console.log(`Using judge model: ${setup.judgeConfig.model}`);
  console.log(`Runs per scenario: ${setup.runs}`);
  if (setup.parallel > 1) {
    console.log(`Parallel concurrency: ${setup.parallel}`);
  }
}

/** Create the timestamped run directory and shared trace logger. */
async function createRunDir(): Promise<
  { runDir: string; tracer: TraceLogger }
> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = join(Deno.cwd(), "benchmarks", "runs", timestamp);
  await Deno.mkdir(runDir, { recursive: true });
  const tracer = new TraceLogger(runDir, "report.html");
  return { runDir, tracer };
}

/** Build the (scenario × runIndex) task list and the matching ExecutionContext. */
function buildExecutionContext(
  cache: CachePrecheck,
  setup: RuntimeSetup,
  runDir: string,
  tracer: TraceLogger,
): {
  ctx: ExecutionContext;
  tasks: { scenario: BenchmarkScenario; runIndex: number }[];
} {
  const tasks: { scenario: BenchmarkScenario; runIndex: number }[] = [];
  for (const scenario of cache.scenariosPendingExec) {
    for (let i = 0; i < setup.runs; i++) {
      tasks.push({ scenario, runIndex: i + 1 });
    }
  }

  const remainingRuns = new Map<string, number>();
  const runResults = new Map<string, BenchmarkResult[]>();
  for (const scenario of cache.scenariosPendingExec) {
    remainingRuns.set(scenario.id, setup.runs);
    runResults.set(scenario.id, []);
  }

  const ctx: ExecutionContext = {
    results: [...cache.cachedResults],
    runDir,
    runs: setup.runs,
    agentModel: setup.agentModel,
    judgeConfig: setup.judgeConfig,
    adapter: setup.adapter,
    tracer,
    scenarioCacheKeys: cache.scenarioCacheKeys,
    cachedScenarioIds: cache.cachedScenarioIds,
    cacheWriteEnabled: cache.cacheWriteEnabled,
    remainingRuns,
    runResults,
    totals: { totalCostAll: 0 },
  };
  return { ctx, tasks };
}

/** Print the trailing report URL and exit non-zero on any failures or
 * cache-check miss (CI gate). Never returns when an exit condition fires. */
function finalizeRun(
  results: BenchmarkResult[],
  scenariosToRun: BenchmarkScenario[],
  runs: number,
  runDir: string,
  cacheCheckMissed: boolean,
): void {
  const reportPath = join(runDir, "report.html");
  console.log(`\nReport: file://${reportPath}`);

  if (hasAnyFailures(results, scenariosToRun, runs)) {
    console.log(`\n${ansi("\x1b[31m")}Some tests failed.${ansi("\x1b[0m")}`);
    Deno.exit(1);
  }

  if (cacheCheckMissed) {
    console.log(
      `\n${
        ansi("\x1b[31m")
      }Cache check failed: one or more scenarios had no matching cache entry. Run \`deno task bench --refresh-cache\` and commit benchmarks/cache/.${
        ansi("\x1b[0m")
      }`,
    );
    Deno.exit(1);
  }
}

/** Parses CLI args, discovers scenarios, runs benchmarks, and prints summary report. */
async function main() {
  const config = await loadConfig();
  const args = parseAndValidateArgs();
  const setup = buildRuntimeSetup(args, config);

  const lockName = (args.lock as string) || "benchmarks.lock";
  const lockFile = join(Deno.cwd(), "benchmarks", lockName);
  await acquireBenchmarkLock(lockFile);

  const allScenarios = await discoverScenarios();
  const scenariosToRun = selectScenarios(
    allScenarios,
    setup.filter,
    setup.skillOverride,
  );

  printRunHeader(setup, scenariosToRun.length);

  const { runDir, tracer } = await createRunDir();

  const ideCliVersion = !setup.cacheFlags.noCache &&
      (setup.runs === 1 || setup.cacheFlags.cacheWithRuns)
    ? await setup.adapter.cliVersion()
    : "";
  const cache = await precheckCache(
    scenariosToRun,
    setup.cacheFlags,
    setup.runs,
    setup.adapter.ide,
    setup.agentModel,
    ideCliVersion,
  );

  const { ctx, tasks } = buildExecutionContext(cache, setup, runDir, tracer);

  await runTasks(tasks, setup.parallel, ctx);

  printDetailedErrors(ctx.results, allScenarios);
  printSummaryTable(ctx.results, ctx.totals.totalCostAll);
  if (setup.runs > 1) {
    printPassRates(ctx.results, scenariosToRun, setup.runs);
  }

  await updateLatestSymlink(runDir);
  finalizeRun(
    ctx.results,
    scenariosToRun,
    setup.runs,
    runDir,
    cache.cacheCheckMissed,
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
