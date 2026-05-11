/**
 * Console reporting helpers for `task-bench.ts` — per-scenario summary table,
 * detailed errors block, pass-rate block (multi-run), aggregate-failure check,
 * trailing report URL + exit logic.
 */
import { join } from "@std/path";
import { ansi } from "../../utils.ts";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";

/** Print the trailing detailed errors & warnings block. */
export function printDetailedErrors(
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
export function printSummaryTable(
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
export function printPassRates(
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

/** Print the trailing report URL and exit non-zero on any failures or
 * cache-check miss (CI gate). Never returns when an exit condition fires. */
export function finalizeRun(
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
