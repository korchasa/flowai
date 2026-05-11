import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

Deno.test("LLM Requester Refactoring", async (t) => {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;

  const costTracker = {
    addCost: () => {},
    addTokens: () => {},
  } as unknown as CostTracker;

  const ctx = {
    runId: "test-run-123",
    debugDir: await Deno.makeTempDir({ prefix: "test-refactor-" }),
    logger,
    startTime: new Date(),
  } as unknown as RunContext;

  await t.step("should support engine injection after creation", async () => {
    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: () => Promise.resolve({
        text: '{"result": "ok"}',
        output: { result: "ok" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        steps: [{ text: '{"result": "ok"}', output: { result: "ok" } }]
        // deno-lint-ignore no-explicit-any
      } as any),
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
      logger,
      costTracker,
      ctx
    });
    
    // Inject engine after creation
    requester.engine = mockEngine;

    const schema = z.object({ result: z.string() });
    const result = await requester({
      messages: [{ role: "user", content: "test prompt" }],
      identifier: "test-id",
      schema,
      stageName: "test-stage",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    expect(result.result).toEqual({ result: "ok" });

    // Cleanup
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
