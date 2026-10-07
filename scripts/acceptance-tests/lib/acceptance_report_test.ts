import { assert, assertEquals } from "@std/assert";
import {
  hasAnyFailures,
  infraErrorLines,
  passRateCounts,
  tokenCostLines,
} from "./acceptance_report.ts";
import { buildInfraErrorResult } from "./infra_abort.ts";
import type { BenchmarkResult, BenchmarkScenario } from "./types.ts";

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

const CAPACITY =
  'codex turn error "server_overloaded": Selected model is at capacity.';

function scenario(id: string): BenchmarkScenario {
  return {
    id,
    name: id,
    sandboxState: { commits: [], expectedOutcome: "" },
    setup: () => Promise.resolve(),
    userQuery: "",
    agentsTemplateVars: { PROJECT_NAME: "X" },
    checklist: [],
  };
}

Deno.test("an infrastructure error fails the sweep and is listed apart from checklist failures", () => {
  const aborted = buildInfraErrorResult("trigger-pos", "gpt", CAPACITY, "");
  const red = {
    ...result(1, 1),
    scenarioId: "plan-basic",
    success: false,
    errorsCount: 1,
  };
  const green = { ...result(1, 1), scenarioId: "draw" };

  assertEquals(infraErrorLines([aborted, red, green]), [
    `trigger-pos: ${CAPACITY}`,
  ]);
  assert(
    hasAnyFailures([aborted, green], [
      scenario("trigger-pos"),
      scenario("draw"),
    ], 1),
  );
  assertEquals(hasAnyFailures([green], [scenario("draw")], 1), false);
});

Deno.test("an infrastructure error is not scored as a checklist failure", () => {
  const aborted = buildInfraErrorResult("trigger-pos", "gpt", CAPACITY, "log");
  assertEquals(aborted.success, false);
  assertEquals(aborted.infraError, CAPACITY);
  assertEquals(aborted.errorsCount, 0);
  assertEquals(aborted.checklistResults, {});
  assertEquals(aborted.logs, "log");
});

Deno.test("passRateCounts names the runs the infrastructure took away", () => {
  const aborted = buildInfraErrorResult("s", "gpt", CAPACITY, "");
  const green = { ...result(1, 1), scenarioId: "s" };
  assertEquals(passRateCounts([green, aborted, green], 3), {
    passed: 2,
    infraErrors: 1,
    ok: true,
  });
  assertEquals(passRateCounts([aborted, aborted, green], 3), {
    passed: 1,
    infraErrors: 2,
    ok: false,
  });
});
