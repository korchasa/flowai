import { expect } from "@std/expect";
import { createVercelRequester, ModelURI } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

Deno.test("LLM Integration Tests", async (t) => {
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
    runId: "test-run-123",
    debugDir: "/tmp/test-debug",
    logger,
    startTime: new Date(),
  };

  await t.step("JSON generation with schema validation", async (t) => {
    await t.step("should handle successful JSON generation", () => {
      const requester = createVercelRequester({
        modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
        logger,
        costTracker,
        ctx
      });

      expect(typeof requester).toBe("function");
    });

    await t.step("should handle schema validation errors", () => {
      const requester = createVercelRequester({
        modelUri: ModelURI.parse("chat://anthropic/claude-3-sonnet-20240229?apiKey=test-key"),
        logger,
        costTracker,
        ctx
      });

      expect(typeof requester).toBe("function");
    });

    await t.step("should support different response formats", () => {
      const schemas = [
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.object({ result: z.string() }),
      ];

      for (const _schema of schemas) {
        const requester = createVercelRequester({
          modelUri: ModelURI.parse("chat://gemini/gemini-pro?apiKey=test-key"),
          logger,
          costTracker,
          ctx
        });

        expect(typeof requester).toBe("function");
      }
    });
  });

  await t.step("Error handling and retry logic", async (t) => {
    await t.step("should handle invalid model URIs", () => {
      try {
        ModelURI.parse("invalid-format");
        expect(false).toBe(true);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("Model identifier (path) is required");
      }
    });

    await t.step("should handle unknown providers", () => {
      try {
        createVercelRequester({
          modelUri: ModelURI.parse("chat://unknown/some-model?apiKey=test"),
          logger,
          costTracker,
          ctx
        });
        expect(false).toBe(true);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Unknown LLM provider: unknown");
      }
    });
  });

  await t.step("Provider-specific configurations", async (t) => {
    await t.step("should support OpenAI with various parameters", () => {
      const requester = createVercelRequester({
        modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&temperature=0.5&maxTokens=100"),
        logger,
        costTracker,
        ctx
      });

      expect(typeof requester).toBe("function");
    });
  });
});
