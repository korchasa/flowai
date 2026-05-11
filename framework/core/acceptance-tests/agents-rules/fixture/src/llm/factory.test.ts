import { expect } from "@std/expect";
import { createLlmRequester } from "./factory.ts";
import { ModelURI } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";

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
  runId: "test-run-factory",
  debugDir: "/tmp/test-debug-factory",
  logger,
  startTime: new Date(),
  saveDebugFile: () => Promise.resolve(),
} as unknown as RunContext;

Deno.test("createLlmRequester factory", async (t) => {
  await t.step("routes openrouter/... to OpenRouter requester without error", () => {
    expect(() =>
      createLlmRequester({
        modelUri: ModelURI.parse("openrouter/openai/gpt-4o?apiKey=test"),
        logger,
        costTracker,
        ctx,
      })
    ).not.toThrow();
  });

  await t.step("routes openai/... to Vercel requester without error", () => {
    expect(() =>
      createLlmRequester({
        modelUri: ModelURI.parse("openai/gpt-4?apiKey=test"),
        logger,
        costTracker,
        ctx,
      })
    ).not.toThrow();
  });

  await t.step("accepts legacy chat://openai/... URI for backward compatibility", () => {
    expect(() =>
      createLlmRequester({
        modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test"),
        logger,
        costTracker,
        ctx,
      })
    ).not.toThrow();
  });

  await t.step("routes chat://openrouter/... to OpenRouter requester without error", () => {
    expect(() =>
      createLlmRequester({
        modelUri: ModelURI.parse("chat://openrouter/anthropic/claude-sonnet-4?apiKey=test"),
        logger,
        costTracker,
        ctx,
      })
    ).not.toThrow();
  });

  await t.step("returns a callable function with .stream property", () => {
    const requester = createLlmRequester({
      modelUri: ModelURI.parse("openai/gpt-4?apiKey=test"),
      logger,
      costTracker,
      ctx,
    });
    expect(typeof requester).toBe("function");
    expect(typeof requester.stream).toBe("function");
  });
});
