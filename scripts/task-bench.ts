/**
 * task-bench.ts — Discovers and runs agent benchmark scenarios.
 *
 * Walks `framework/<pack>/skills/<skill>/benchmarks/` for scenario mod.ts files,
 * runs each through the benchmark runner with LLM-Judge evaluation, and
 * outputs results as console summary + HTML report.
 *
 * Usage: deno task bench [-f filter] [-m model] [-i ide] [-n runs]
 */
import { dirname, join } from "@std/path";
import { parse } from "@std/flags";
import { existsSync, walk } from "@std/fs";
import { ansi } from "./utils.ts";
import type {
  BenchmarkResult,
  BenchmarkScenario,
} from "./benchmarks/lib/types.ts";
import { runScenario } from "./benchmarks/lib/runner.ts";
import {
  getIdeConfig,
  loadConfig,
  type ModelConfig,
} from "./benchmarks/lib/llm.ts";
import {
  createAdapter,
  SUPPORTED_IDES,
} from "./benchmarks/lib/adapters/mod.ts";
import { TraceLogger } from "./benchmarks/lib/trace.ts";

async function discoverScenarios(): Promise<BenchmarkScenario[]> {
  const scenarios: BenchmarkScenario[] = [];
  const frameworkDir = join(Deno.cwd(), "framework");

  if (!existsSync(frameworkDir)) {
    return scenarios;
  }

  // Walk pack-structured framework: framework/<pack>/skills/<skill>/benchmarks/*/mod.ts
  for await (const packEntry of Deno.readDir(frameworkDir)) {
    if (!packEntry.isDirectory) continue;
    const packSkillsDir = join(frameworkDir, packEntry.name, "skills");
    if (!existsSync(packSkillsDir)) continue;

    for await (
      const entry of walk(packSkillsDir, {
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
            scenario.pack = packEntry.name;
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

  return scenarios;
}

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
  -p, --parallel <number>      Max concurrent scenarios (default: 1, sequential)
  --lock <string>              Custom lock file name (default: benchmarks.lock)
  --help                       Show this help message
  `);
}

async function main() {
  const config = await loadConfig();

  const args = parse(Deno.args, {
    string: ["filter", "runs", "model", "ide", "parallel", "lock"],
    boolean: ["help"],
    alias: {
      f: "filter",
      n: "runs",
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

  if (args.help) {
    printHelp("<per IDE>");
    Deno.exit(0);
  }

  if (args._.length > 0) {
    console.error(`Unexpected positional arguments: ${args._.join(", ")}`);
    printHelp("<per IDE>");
    Deno.exit(1);
  }

  const lockName = args.lock || "benchmarks.lock";
  const lockFile = join(Deno.cwd(), "benchmarks", lockName);

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

  // Ensure lock file is removed on exit
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

  const ideName = args.ide || config.default_ides[0];
  const adapter = createAdapter(ideName);
  const ideConfig = getIdeConfig(config, ideName);

  const agentModel = args.model || ideConfig.default_agent_model;
  const judgeConfig: ModelConfig = { ...ideConfig.judge };

  const filter = args.filter;
  const runs = parseInt(args.runs || "1", 10);
  const parallel = parseInt(args.parallel || "1", 10);

  const allScenarios = await discoverScenarios();
  const scenariosToRun = filter
    ? allScenarios.filter((s) => s.id.includes(String(filter)))
    : allScenarios;

  console.log(`Found ${scenariosToRun.length} scenarios.`);
  console.log(`Using IDE: ${adapter.ide}`);
  console.log(`Using agent model: ${agentModel}`);
  console.log(`Using judge model: ${judgeConfig.model}`);
  console.log(`Runs per scenario: ${runs}`);
  if (parallel > 1) {
    console.log(`Parallel concurrency: ${parallel}`);
  }

  const results: BenchmarkResult[] = [];

  // Create single timestamped run directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runDir = join(Deno.cwd(), "benchmarks", "runs", timestamp);
  await Deno.mkdir(runDir, { recursive: true });

  // Create single shared TraceLogger
  const tracer = new TraceLogger(runDir, "report.html");

  let totalCostAll = 0;

  // Build flat list of tasks: (scenario, runIndex) pairs
  const tasks: { scenario: BenchmarkScenario; runIndex: number }[] = [];
  for (const scenario of scenariosToRun) {
    for (let i = 0; i < runs; i++) {
      tasks.push({ scenario, runIndex: i + 1 });
    }
  }

  /** Runs a single scenario+run task, prints results, and pushes to results array. */
  async function executeTask(
    task: { scenario: BenchmarkScenario; runIndex: number },
  ) {
    const { scenario, runIndex } = task;
    if (runs > 1) {
      console.log(`\n--- Run ${runIndex}/${runs} for ${scenario.id} ---`);
    }
    const scenarioWorkDir = join(runDir, scenario.id, `run-${runIndex}`);
    try {
      const result = await runScenario(scenario, {
        agentModel,
        judgeConfig,
        workDir: scenarioWorkDir,
        adapter,
        tracer,
        runIndex,
      });
      results.push(result);
      totalCostAll += result.totalCost;

      const statusLabel = result.success ? "PASSED" : "FAILED";
      console.log(
        `  Result: ${statusLabel} (Errors: ${result.errorsCount}, Warnings: ${result.warningsCount}) Cost: $${
          result.totalCost.toFixed(6)
        }`,
      );
      console.log("  Checklist:");
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

      if (!result.success) {
        const reportPath = join(runDir, "report.html");
        console.log(
          `\n  ${ansi("\x1b[31m")}See trace for details: file://${reportPath}${
            ansi("\x1b[0m")
          }\n`,
        );
      }
    } catch (e) {
      console.error(`  Error running scenario ${scenario.id}:`, e);
    }
  }

  // Execute tasks with concurrency control
  if (parallel <= 1) {
    // Sequential mode (default)
    for (const task of tasks) {
      await executeTask(task);
    }
  } else {
    // Parallel mode with semaphore
    let running = 0;
    let taskIndex = 0;
    const errors: Error[] = [];

    await new Promise<void>((resolve) => {
      function scheduleNext() {
        while (running < parallel && taskIndex < tasks.length) {
          const task = tasks[taskIndex++];
          running++;
          executeTask(task).catch((e) => {
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

  const failedResults = results.filter((r) =>
    r.errorsCount > 0 || r.warningsCount > 0
  );
  if (failedResults.length > 0) {
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

  if (runs > 1) {
    const threshold = Math.ceil(runs / 2);
    console.log(`\n--- PASS RATES (threshold: ${threshold}/${runs}) ---`);
    for (const scenario of scenariosToRun) {
      const scenarioResults = results.filter((r) =>
        r.scenarioId === scenario.id
      );
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

  // Create latest symlink
  const latestLink = join(Deno.cwd(), "benchmarks", "runs", "latest");
  try {
    await Deno.remove(latestLink);
  } catch {
    // ignore if doesn't exist
  }
  await Deno.symlink(runDir, latestLink);

  // Print report URL
  const reportPath = join(runDir, "report.html");
  console.log(`\nReport: file://${reportPath}`);

  // Determine overall success
  // With multiple runs: scenario passes if >50% of runs succeed
  // With single run: scenario passes if that run succeeds
  let hasFailures = false;
  if (runs > 1) {
    for (const scenario of scenariosToRun) {
      const scenarioResults = results.filter((r) =>
        r.scenarioId === scenario.id
      );
      const passed = scenarioResults.filter((r) => r.success).length;
      if (passed < Math.ceil(runs / 2)) {
        hasFailures = true;
        break;
      }
    }
  } else {
    hasFailures = results.some((r) => !r.success);
  }

  if (hasFailures) {
    console.log(`\n${ansi("\x1b[31m")}Some tests failed.${ansi("\x1b[0m")}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
