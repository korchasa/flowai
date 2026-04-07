import { expect } from "@std/expect";
import { ModelURI } from "./llm.ts";
import { createOpenRouterRequester } from "../openrouter/openrouter.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";
import "dotenv/config";

Deno.test("OpenRouter Acceptance Tests", async (t) => {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;
  const costTracker = {
    addCost: () => {},
    addTokens: () => {},
    getReport: () => ({
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0
    }),
  } as unknown as CostTracker;
  const ctx: RunContext = {
    runId: "acceptance-test-run",
    debugDir: "/tmp/acceptance-debug",
    logger,
    startTime: new Date(),
  };

  const testSchema = z.object({
    message: z.string(),
    count: z.number(),
    active: z.boolean()
  });

  await t.step("should generate valid JSON with correct cost tracking", async () => {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const skipAcceptanceTests = Deno.env.get("SKIP_ACCEPTANCE_TESTS") === 'true';
    const modelName = Deno.env.get("ACCEPTANCE_TEST_MODEL_NAME") || 'meta-llama/llama-3-8b-instruct';

    if (!apiKey && !skipAcceptanceTests && Deno.env.get("GITHUB_ACTIONS") !== 'true') {
      console.warn("⚠️  Skipping acceptance test: OPENROUTER_API_KEY not set");
      return;
    }

    if (skipAcceptanceTests || !apiKey) {
      console.warn("⚠️  Skipping acceptance test: OPENROUTER_API_KEY not set or SKIP_ACCEPTANCE_TESTS=true");
      return;
    }

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse(`chat://openrouter/${modelName}?apiKey=${apiKey}`),
      logger,
      costTracker,
      ctx
    });

    const prompt = "Generate a JSON object with a message, count, and active status. Make it something simple and positive.";
    const result = await requester({
      messages: [{ role: "user", content: prompt }],
      identifier: "acceptance-test",
      schema: testSchema,
      stageName: "acceptance-testing",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    expect(result.result).not.toBeNull();
    expect(result.result).toBeDefined();

    const parsedResult = result.result as z.infer<typeof testSchema>;
    expect(typeof parsedResult.message).toBe("string");
    expect(parsedResult.message.length).toBeGreaterThan(0);
    expect(typeof parsedResult.count).toBe("number");
    expect(typeof parsedResult.active).toBe("boolean");

    expect(typeof result.estimatedCost).toBe("number");

    expect(typeof result.inputTokens).toBe("number");
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(typeof result.outputTokens).toBe("number");
    expect(result.outputTokens).toBeGreaterThan(0);

    expect(result.validationError).toBeUndefined();
  });
});
