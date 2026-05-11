/**
 * Benchmark runtime setup, run-dir lifecycle, and task scheduler.
 * Encapsulates per-scenario execution, parallelism, and the per-run cache
 * write hook from `bench_cache_precheck.ts`.
 */
import { join } from "@std/path";
import type { Args } from "@std/flags";
import { ansi } from "../../utils.ts";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";
import { runScenario } from "./runner.ts";
import { type BenchmarkConfig, getIdeConfig, type ModelConfig } from "./llm.ts";
import { type AgentAdapter, createAdapter } from "./adapters/mod.ts";
import { TraceLogger } from "./trace.ts";
import {
  type CacheFlags,
  maybeWriteScenarioCache,
} from "./bench_cache_precheck.ts";
import type { CachePrecheck } from "./bench_cache_precheck.ts";

export interface RuntimeSetup {
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
export function buildRuntimeSetup(
  args: Args,
  config: BenchmarkConfig,
): RuntimeSetup {
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

/** Create the timestamped run directory and shared trace logger. */
export async function createRunDir(): Promise<
  { runDir: string; tracer: TraceLogger }
> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = join(Deno.cwd(), "benchmarks", "runs", timestamp);
  await Deno.mkdir(runDir, { recursive: true });
  const tracer = new TraceLogger(runDir, "report.html");
  return { runDir, tracer };
}

/** Replace `benchmarks/runs/latest` symlink with the current run directory. */
export async function updateLatestSymlink(runDir: string): Promise<void> {
  const latestLink = join(Deno.cwd(), "benchmarks", "runs", "latest");
  try {
    await Deno.remove(latestLink);
  } catch {
    // ignore if doesn't exist
  }
  await Deno.symlink(runDir, latestLink);
}

/** Echo the resolved runtime header (IDE, models, runs, parallelism). */
export function printRunHeader(
  setup: RuntimeSetup,
  scenarioCount: number,
): void {
  console.log(`Found ${scenarioCount} scenarios.`);
  console.log(`Using IDE: ${setup.adapter.ide}`);
  console.log(`Using agent model: ${setup.agentModel}`);
  console.log(`Using judge model: ${setup.judgeConfig.model}`);
  console.log(`Runs per scenario: ${setup.runs}`);
  if (setup.parallel > 1) {
    console.log(`Parallel concurrency: ${setup.parallel}`);
  }
}

export interface ExecutionContext {
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

/** Build the (scenario × runIndex) task list and the matching ExecutionContext. */
export function buildExecutionContext(
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
export async function runTasks(
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
