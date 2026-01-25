import { join } from "@std/path";
import { parse } from "@std/flags";
import { BenchmarkResult, BenchmarkScenario } from "./benchmarks/lib/types.ts";
import { runScenario } from "./benchmarks/lib/runner.ts";

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

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

async function main() {
  const args = parse(Deno.args, {
    string: ["model", "filter", "runs"],
    alias: { m: "model", f: "filter", n: "runs" },
  });

  const filter = args.filter;
  const model = args.model || DEFAULT_MODEL;
  const runs = parseInt(args.runs || "1", 10);

  const scenariosToRun = filter
    ? SCENARIOS.filter((s) => s.id.includes(String(filter)))
    : SCENARIOS;

  console.log(`Found ${scenariosToRun.length} scenarios.`);
  console.log(`Using model: ${model}`);
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
        const result = await runScenario(scenario, { model, workDir });
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

          console.log(
            `    ${color}[${mark}] ${id}${label}: ${res.reason}\x1b[0m`,
          );
        }

        if (!result.success) {
          console.log("\n  --- DEBUG INFO (FAILED) ---");
          console.log("  Agent Output:");
          console.log(result.logs);
          console.log("\n  Evidence:");
          console.log(result.evidence);
          console.log("  ---------------------------\n");
        }
      } catch (e) {
        console.error(`  Error running scenario ${scenario.id}:`, e);
      }
    }
  }

  console.log("\n--- SUMMARY ---");
  console.log(
    `${"ID".padEnd(30)} | ${"Model".padEnd(30)} | ${
      "Status".padEnd(
        15,
      )
    } | ${"E/W".padEnd(6)} | ${"Steps".padEnd(6)} | ${
      "Time (ms)".padEnd(10)
    } | ${
      "Tokens".padEnd(
        10,
      )
    } | ${"Cost ($)"}`,
  );
  console.log("-".repeat(140));

  for (const r of results) {
    let status = r.success ? "PASSED" : "FAILED";
    let color = r.success ? "\x1b[32m" : "\x1b[31m"; // Green : Red

    if (r.success && r.warningsCount > 0) {
      status = "WARNING"; // Passed with non-critical failures
      color = "\x1b[33m"; // Yellow
    }

    const statusStr = `${color}${status.padEnd(15)}\x1b[0m`;
    const ewStr = `${r.errorsCount}/${r.warningsCount}`;

    console.log(
      `${r.scenarioId.padEnd(30)} | ${r.model.padEnd(30)} | ${statusStr} | ${
        ewStr.padEnd(6)
      } | ${r.toolCallsCount.toString().padEnd(6)} | ${
        r.durationMs.toFixed(0).padEnd(10)
      } | ${r.tokensUsed.toString().padEnd(10)} | $${r.totalCost.toFixed(6)}`,
    );
  }

  console.log("-".repeat(140));
  console.log(`TOTAL COST: $${totalCostAll.toFixed(6)}`);

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
