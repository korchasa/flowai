import { join } from "@std/path";
import { parse } from "@std/flags";
import { BenchmarkResult, BenchmarkScenario } from "./benchmarks/lib/types.ts";
import { runScenario } from "./benchmarks/lib/runner.ts";
import { loadConfig, ModelConfig } from "./benchmarks/lib/llm.ts";

// Import scenarios from the new structure
import { CommitBasicBench } from "./benchmarks/scenarios/af-commit/basic/mod.ts";
import { CommitAtomicRefactorBench } from "./benchmarks/scenarios/af-commit/atomic-refactor/mod.ts";
import { CommitAtomicDocsBench } from "./benchmarks/scenarios/af-commit/atomic-docs/mod.ts";
import { CommitCheckBench } from "./benchmarks/scenarios/af-commit/check/mod.ts";
import { CommitSyncDocsBench } from "./benchmarks/scenarios/af-commit/sync-docs/mod.ts";
import { CommitAtomicHunkBench } from "./benchmarks/scenarios/af-commit/atomic-hunk/mod.ts";
import { CommitDepsBench } from "./benchmarks/scenarios/af-commit/deps/mod.ts";
import { CommitCheckFailBench } from "./benchmarks/scenarios/af-commit/check-fail/mod.ts";

import { PlanBasicBench } from "./benchmarks/scenarios/af-plan/basic/mod.ts";
import { PlanContextBench } from "./benchmarks/scenarios/af-plan/context/mod.ts";
import { PlanInteractiveBench } from "./benchmarks/scenarios/af-plan/interactive/mod.ts";
import { PlanRefactorBench } from "./benchmarks/scenarios/af-plan/refactor/mod.ts";
import { PlanMigrationBench } from "./benchmarks/scenarios/af-plan/migration/mod.ts";
import { PlanDbFeatureBench } from "./benchmarks/scenarios/af-plan/db-feature/mod.ts";

const SCENARIOS: BenchmarkScenario[] = [
  CommitBasicBench,
  CommitAtomicRefactorBench,
  CommitAtomicDocsBench,
  CommitCheckBench,
  CommitSyncDocsBench,
  CommitAtomicHunkBench,
  CommitDepsBench,
  CommitCheckFailBench,
  PlanBasicBench,
  PlanContextBench,
  PlanInteractiveBench,
  PlanRefactorBench,
  PlanMigrationBench,
  PlanDbFeatureBench,
];

function printHelp(defaultAgentPreset: string, defaultJudgePreset: string) {
  console.log(`
Usage: deno task bench [options]

Options:
  -f, --filter <string>        Filter scenarios by ID (substring match)
  -p, --preset <string>        Agent preset to use (default: ${defaultAgentPreset})
  --judge-preset <string>      Judge preset to use (default: ${defaultJudgePreset})
  -n, --runs <number>          Number of runs per scenario (default: 1)
  --help                       Show this help message
  `);
}

async function main() {
  const config = await loadConfig();

  const args = parse(Deno.args, {
    string: ["filter", "runs", "preset", "judge-preset"],
    boolean: ["help"],
    alias: { f: "filter", n: "runs", h: "help", p: "preset" },
    unknown: (arg) => {
      if (arg.startsWith("-")) {
        console.error(`Unknown argument: ${arg}`);
        printHelp(config.default_agent_preset, config.default_judge_preset);
        Deno.exit(1);
      }
      return true;
    },
  });

  if (args.help) {
    printHelp(config.default_agent_preset, config.default_judge_preset);
    Deno.exit(0);
  }

  if (args._.length > 0) {
    console.error(`Unexpected positional arguments: ${args._.join(", ")}`);
    printHelp(config.default_agent_preset, config.default_judge_preset);
    Deno.exit(1);
  }

  const agentPresetName = args.preset || config.default_agent_preset;
  const agentPreset = config.presets[agentPresetName];
  if (!agentPreset) {
    console.error(`Unknown agent preset: ${agentPresetName}`);
    Deno.exit(1);
  }

  const agentConfig: ModelConfig = { ...agentPreset };

  const judgePresetName = args["judge-preset"] || config.default_judge_preset;
  const judgePreset = config.presets[judgePresetName];
  if (!judgePreset) {
    console.error(`Unknown judge preset: ${judgePresetName}`);
    Deno.exit(1);
  }

  const judgeConfig: ModelConfig = { ...judgePreset };

  const filter = args.filter;
  const runs = parseInt(args.runs || "1", 10);

  const scenariosToRun = filter
    ? SCENARIOS.filter((s) => s.id.includes(String(filter)))
    : SCENARIOS;

  console.log(`Found ${scenariosToRun.length} scenarios.`);
  console.log(`Using agent preset: ${agentPresetName}`);
  console.log(`Using agent model: ${agentConfig.model}`);
  console.log(`Using judge preset: ${judgePresetName}`);
  console.log(`Using judge model: ${judgeConfig.model}`);
  console.log(`Runs per scenario: ${runs}`);

  const results: BenchmarkResult[] = [];
  const workDir = join(Deno.cwd(), "scripts/benchmarks/work");

  let totalCostAll = 0;

  for (const scenario of scenariosToRun) {
    for (let i = 0; i < runs; i++) {
      if (runs > 1) {
        console.log(`\n--- Run ${i + 1}/${runs} for ${scenario.id} ---`);
      }
      try {
        const result = await runScenario(scenario, {
          agentConfig,
          judgeConfig,
          workDir,
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

          let color = "\x1b[32m"; // Green
          let mark = "x";
          let label = "";

          if (!res.pass) {
            if (isCritical) {
              color = "\x1b[31m"; // Red
              mark = " ";
              label = " (ERROR)";
            } else {
              color = "\x1b[33m"; // Yellow
              mark = "!";
              label = " (WARNING)";
            }
          }

          const dim = "\x1b[2m";
          console.log(
            `    ${color}[${mark}] ${id}${label}:\x1b[0m ${dim}${res.reason}\x1b[0m`,
          );
        }

        if (!result.success) {
          console.log(
            `\n  \x1b[31mSee trace for details: ${
              join(workDir, result.scenarioId, "trace.html").replace(
                Deno.cwd(),
                ".",
              )
            }\x1b[0m\n`,
          );
        }
      } catch (e) {
        console.error(`  Error running scenario ${scenario.id}:`, e);
      }
    }
  }

  const failedResults = results.filter((r) =>
    r.errorsCount > 0 || r.warningsCount > 0
  );
  if (failedResults.length > 0) {
    console.log("\n--- DETAILED ERRORS & WARNINGS ---");
    for (const r of failedResults) {
      const scenario = SCENARIOS.find((s) => s.id === r.scenarioId);
      console.log(
        `\nScenario: ${scenario?.name || r.scenarioId} (${r.scenarioId})`,
      );
      for (const [id, res] of Object.entries(r.checklistResults)) {
        if (!res.pass) {
          const item = scenario?.checklist.find((i) => i.id === id);
          const isCritical = item?.critical ?? true;
          const color = isCritical ? "\x1b[31m" : "\x1b[33m";
          const label = isCritical ? "ERROR" : "WARNING";
          const dim = "\x1b[2m";
          console.log(
            `  ${color}[${label}] ${id}:\x1b[0m ${dim}${res.reason}\x1b[0m`,
          );
        }
      }
      console.log(
        `  \x1b[34mTrace: ${
          join(workDir, r.scenarioId, "trace.html").replace(Deno.cwd(), ".")
        }\x1b[0m`,
      );
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
      ? "\x1b[31m"
      : (r.warningsCount > 0 ? "\x1b[33m" : "\x1b[32m");
    const errColor = r.errorsCount > 0 ? "\x1b[31m" : "";
    const wrnColor = r.warningsCount > 0 ? "\x1b[33m" : "";
    const reset = "\x1b[0m";

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
    console.log("\n--- PASS RATES ---");
    for (const scenario of scenariosToRun) {
      const scenarioResults = results.filter((r) =>
        r.scenarioId === scenario.id
      );
      const passed = scenarioResults.filter((r) => r.success).length;
      const rate = (passed / runs) * 100;
      console.log(
        `${scenario.id.padEnd(30)}: ${rate.toFixed(1)}% (${passed}/${runs})`,
      );
    }
  }

  const hasFailures = results.some((r) => !r.success);
  if (hasFailures) {
    console.log("\n\x1b[31mSome tests failed.\x1b[0m");
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
