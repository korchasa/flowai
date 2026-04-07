import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

Deno.test("LLM Timeout", async (t) => {
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
    debugDir: await Deno.makeTempDir({ prefix: "test-timeout-" }),
    logger,
    startTime: new Date(),
  } as unknown as RunContext;

  const mockTimeoutEngine: LlmEngine = {
    streamText: () => ({}),
    generateText: (params: Record<string, unknown>) => {
      return new Promise((_resolve, reject) => {
        const signal = params.abortSignal as AbortSignal | undefined;
        if (signal?.aborted) {
          const error = new Error("Request timed out after 10ms");
          error.name = "AbortError";
          reject(error);
          return;
        }
        signal?.addEventListener("abort", () => {
          const error = new Error("Request timed out after 10ms");
          error.name = "AbortError";
          reject(error);
        });
      });
    },
  };

  await t.step("should handle timeout correctly", async () => {
    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&timeout=10"),
      logger,
      costTracker,
      ctx
    });
    requester.engine = mockTimeoutEngine;

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

    expect(result.result).toBeNull();
    expect(result.validationError).toContain("Request timed out after 10ms");

    // Cleanup
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
