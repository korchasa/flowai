/**
 * task-bench.ts — Discovers and runs agent benchmark scenarios.
 *
 * Walks `framework/<pack>/skills/<skill>/benchmarks/`,
 * `framework/<pack>/commands/<command>/benchmarks/`, and
 * `framework/<pack>/agents/<agent>/benchmarks/` for scenario mod.ts files.
 * Runs each through the benchmark runner with LLM-Judge evaluation, and
 * outputs results as console summary + HTML report.
 *
 * The implementation is split across `scripts/benchmarks/lib/bench_*.ts`
 * modules so this entry point stays a thin orchestrator:
 *   - bench_cli.ts            — argv parsing, help text, lock file
 *   - bench_discovery.ts      — scenario discovery + filter/override
 *   - bench_cache_precheck.ts — pre-run cache lookup + post-run cache write
 *   - bench_runtime.ts        — runtime setup, run-dir, task scheduler
 *   - bench_report.ts         — summary table, pass-rate block, finalizeRun
 *
 * Usage: deno task bench [-f filter] [-m model] [-i ide] [-n runs]
 */
import { join } from "@std/path";
import { loadConfig } from "./benchmarks/lib/llm.ts";
import {
  acquireBenchmarkLock,
  parseAndValidateArgs,
} from "./benchmarks/lib/bench_cli.ts";
import {
  discoverScenarios,
  selectScenarios,
} from "./benchmarks/lib/bench_discovery.ts";
import { precheckCache } from "./benchmarks/lib/bench_cache_precheck.ts";
import {
  buildExecutionContext,
  buildRuntimeSetup,
  createRunDir,
  printRunHeader,
  runTasks,
  updateLatestSymlink,
} from "./benchmarks/lib/bench_runtime.ts";
import {
  finalizeRun,
  printDetailedErrors,
  printPassRates,
  printSummaryTable,
} from "./benchmarks/lib/bench_report.ts";

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
