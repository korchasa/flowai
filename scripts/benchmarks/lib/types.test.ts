import { assertEquals } from "@std/assert";
import type { BenchmarkResult, LLMResponse } from "./types.ts";

Deno.test("Types - BenchmarkResult should have totalCost", () => {
  const result: BenchmarkResult = {
    scenarioId: "test",
    success: true,
    score: 100,
    errorsCount: 0,
    warningsCount: 0,
    durationMs: 100,
    tokensUsed: 100,
    totalCost: 0.001,
    toolCallsCount: 1,
    model: "test-model",
    checklistResults: {},
    logs: "",
  };
  assertEquals(result.totalCost, 0.001);
});

Deno.test("Types - LLMResponse usage should have cost", () => {
  const response: LLMResponse = {
    content: "test",
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
      cost: 0.0001,
    },
  };
  assertEquals(response.usage?.cost, 0.0001);
});
