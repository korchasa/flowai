import { assert, assertEquals } from "@std/assert";
import { tokenCostLines } from "./acceptance_report.ts";
import type { BenchmarkResult } from "./types.ts";

function result(
  agentTotal: number,
  judgeTotal: number,
): BenchmarkResult {
  const agent = {
    freshInput: 10,
    cachedInput: 90,
    cacheWrite: 1,
    output: 2,
    reasoning: 3,
    total: agentTotal,
  };
  const judge = {
    freshInput: 1,
    cachedInput: 2,
    cacheWrite: 0,
    output: 3,
    reasoning: 4,
    total: judgeTotal,
  };
  return {
    scenarioId: "s",
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 0,
    tokensUsed: agentTotal + judgeTotal,
    tokensDetails: {
      agent,
      judge,
      total: {
        freshInput: 11,
        cachedInput: 92,
        cacheWrite: 1,
        output: 5,
        reasoning: 7,
        total: agentTotal + judgeTotal,
      },
    },
    totalCost: 0,
    toolCallsCount: 0,
    model: "m",
    checklistResults: {},
    logs: "",
  };
}

Deno.test("tokenCostLines: every arm is summed across the runs of the sweep", () => {
  const lines = tokenCostLines([result(1000, 10), result(500, 5)]);
  const agent = lines.find((l) => l.startsWith("agent"));
  const judge = lines.find((l) => l.startsWith("judge"));
  const total = lines.find((l) => l.startsWith("total"));
  assert(agent && judge && total);
  assert(agent.includes("1,500 total"), agent);
  assert(judge.includes("15 total"), judge);
  assert(total.includes("1,515 total"), total);
});

Deno.test("tokenCostLines: every line names all five cost types", () => {
  for (const line of tokenCostLines([result(1, 1)])) {
    for (
      const part of ["fresh in", "cached in", "cache write", "out", "reasoning"]
    ) {
      assert(line.includes(part), `${part} missing from: ${line}`);
    }
  }
});

Deno.test("tokenCostLines: a sweep that measured nothing says so", () => {
  const bare = { ...result(1, 1) };
  delete bare.tokensDetails;
  assertEquals(tokenCostLines([bare]), []);
});
