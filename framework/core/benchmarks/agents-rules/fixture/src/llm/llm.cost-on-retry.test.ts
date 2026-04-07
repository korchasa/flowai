/**
 * Tests that CostTracker accumulates tokens and costs from ALL attempts,
 * including failed ones where Zod schema validation did not pass.
 */

import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import { NoObjectGeneratedError } from "ai";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

// --- Helpers ---

function makeTestDeps() {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;

  const addCostCalls: number[] = [];
  const addTokensCalls: Array<{ input: number; output: number }> = [];

  const costTracker = {
    addCost: (cost: number) => { addCostCalls.push(cost); },
    addTokens: (input: number, output: number) => { addTokensCalls.push({ input, output }); },
  } as unknown as CostTracker;

  return { logger, costTracker, addCostCalls, addTokensCalls };
}

async function makeCtx(logger: Logger): Promise<RunContext> {
  return {
    runId: "test-cost-retry",
    debugDir: await Deno.makeTempDir({ prefix: "test-cost-retry-" }),
    logger,
    startTime: new Date(),
  } as unknown as RunContext;
}

/**
 * Creates a fake StreamTextResult that mirrors the Vercel AI SDK interface.
 */
function makeFakeStreamResult(opts: {
  textChunks: string[];
  output?: unknown;
  outputError?: Error;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const {
    textChunks,
    output = null,
    outputError,
    inputTokens = 10,
    outputTokens = 20,
  } = opts;

  const fullText = textChunks.join("");

  async function* makeTextStream() {
    for (const chunk of textChunks) {
      yield chunk;
    }
  }

  // deno-lint-ignore no-explicit-any
  async function* makeFullStream(): AsyncIterable<any> {
    for (const chunk of textChunks) {
      yield { type: "text-delta", textDelta: chunk };
    }
    yield {
      type: "finish",
      finishReason: "stop",
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    };
  }

  return {
    textStream: makeTextStream(),
    fullStream: makeFullStream(),
    text: Promise.resolve(fullText),
    output: outputError ? Promise.reject(outputError) : Promise.resolve(output),
    usage: Promise.resolve({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens }),
    toolCalls: Promise.resolve([]),
    toolResults: Promise.resolve([]),
    steps: Promise.resolve([]),
    finishReason: Promise.resolve("stop"),
    rawResponse: Promise.resolve(undefined),
    providerMetadata: Promise.resolve(undefined),
    experimental_providerMetadata: Promise.resolve(undefined),
    // deno-lint-ignore no-explicit-any
  } as any;
}

// --- Non-streaming tests ---

Deno.test("Non-streaming: cost tracker accumulates tokens from failed validation attempts", async () => {
  const { logger, costTracker, addCostCalls, addTokensCalls } = makeTestDeps();
  const ctx = await makeCtx(logger);

  const schema = z.object({ value: z.number() });
  const validResponse = { value: 42 };

  let callCount = 0;

  const mockEngine: LlmEngine = {
    streamText: () => ({}) as never,
    generateText: () => {
      callCount++;
      if (callCount === 1) {
        // First attempt: throw NoObjectGeneratedError with usage data
        throw new NoObjectGeneratedError({
          message: "Response did not match schema",
          text: '{"value": "not-a-number"}',
          response: {
            id: "resp-1",
            modelId: "gpt-4",
            timestamp: new Date(),
            headers: {},
          },
          usage: {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
            inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
            outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
          },
          finishReason: "stop",
        });
      }
      // Second attempt: success
      return Promise.resolve({
        text: JSON.stringify(validResponse),
        output: validResponse,
        finishReason: "stop",
        usage: { inputTokens: 120, outputTokens: 60, totalTokens: 180 },
        steps: [{ text: JSON.stringify(validResponse), output: validResponse }],
        // deno-lint-ignore no-explicit-any
      } as any);
    },
  };

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = mockEngine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-cost-retry-nonstream",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  expect(result.result).toEqual(validResponse);
  expect(callCount).toBe(2);

  // costTracker.addTokens should have been called twice:
  // once for the failed attempt (100 input, 50 output)
  // once for the successful attempt (120 input, 60 output)
  expect(addTokensCalls.length).toBe(2);
  expect(addTokensCalls[0]).toEqual({ input: 100, output: 50 });
  expect(addTokensCalls[1]).toEqual({ input: 120, output: 60 });

  // addCost called twice as well
  expect(addCostCalls.length).toBe(2);

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: cost tracker reports zero tokens for errors without usage (e.g. TypeValidationError)", async () => {
  const { logger, costTracker, addCostCalls, addTokensCalls } = makeTestDeps();
  const ctx = await makeCtx(logger);

  const schema = z.object({ value: z.number() });
  const validResponse = { value: 42 };

  let callCount = 0;

  const mockEngine: LlmEngine = {
    streamText: () => ({}) as never,
    generateText: () => {
      callCount++;
      if (callCount === 1) {
        // First attempt: generic error without usage data
        throw new Error("Something went wrong parsing");
      }
      // Second attempt: success
      return Promise.resolve({
        text: JSON.stringify(validResponse),
        output: validResponse,
        finishReason: "stop",
        usage: { inputTokens: 80, outputTokens: 40, totalTokens: 120 },
        steps: [{ text: JSON.stringify(validResponse), output: validResponse }],
        // deno-lint-ignore no-explicit-any
      } as any);
    },
  };

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = mockEngine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-cost-retry-no-usage",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  expect(result.result).toEqual(validResponse);
  expect(callCount).toBe(2);

  // Only the successful attempt should report tokens
  // (generic Error has no usage, so addTokens should NOT be called for it)
  expect(addTokensCalls.length).toBe(1);
  expect(addTokensCalls[0]).toEqual({ input: 80, output: 40 });
  expect(addCostCalls.length).toBe(1);

  await Deno.remove(ctx.debugDir, { recursive: true });
});

// --- Streaming structured tests ---

Deno.test("Streaming structured: cost tracker accumulates tokens from failed validation attempts", async () => {
  const { logger, costTracker, addCostCalls, addTokensCalls } = makeTestDeps();
  const ctx = await makeCtx(logger);

  const schema = z.object({ value: z.number() });
  const validObject = { value: 99 };

  let callCount = 0;

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });

  const mockEngine: LlmEngine = {
    generateText: () => Promise.resolve({} as never),
    streamText: () => {
      callCount++;
      if (callCount === 1) {
        // First attempt: validation failure — output is null, but usage is available
        return makeFakeStreamResult({
          textChunks: ['{"value": "not-a-number"}'],
          output: null,
          inputTokens: 200,
          outputTokens: 100,
        });
      }
      // Second attempt: success
      return makeFakeStreamResult({
        textChunks: [JSON.stringify(validObject)],
        output: validObject,
        inputTokens: 220,
        outputTokens: 110,
      });
    },
  };
  requester.engine = mockEngine;

  const stream = requester.stream<{ value: number }>({
    messages: [{ role: "user", content: "give me a number object" }],
    identifier: "test-cost-stream-retry",
    schema,
    tools: undefined,
    maxSteps: undefined,
    stageName: "test",
    settings: undefined,
  });

  const result = await stream.output;
  expect(result).toEqual(validObject);
  expect(callCount).toBeGreaterThanOrEqual(2);

  // Both attempts should have tracked tokens
  expect(addTokensCalls.length).toBe(2);
  expect(addTokensCalls[0]).toEqual({ input: 200, output: 100 });
  expect(addTokensCalls[1]).toEqual({ input: 220, output: 110 });
  expect(addCostCalls.length).toBe(2);

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Streaming structured: cost tracker accumulates tokens when output promise rejects", async () => {
  const { logger, costTracker, addCostCalls, addTokensCalls } = makeTestDeps();
  const ctx = await makeCtx(logger);

  const schema = z.object({ value: z.number() });
  const validObject = { value: 77 };

  let callCount = 0;

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });

  const mockEngine: LlmEngine = {
    generateText: () => Promise.resolve({} as never),
    streamText: () => {
      callCount++;
      if (callCount === 1) {
        // First attempt: output promise rejects (real SDK behavior on validation failure)
        return makeFakeStreamResult({
          textChunks: ['{"value": "bad"}'],
          outputError: new Error("Expected number, received string at path: value"),
          inputTokens: 150,
          outputTokens: 75,
        });
      }
      // Second attempt: success
      return makeFakeStreamResult({
        textChunks: [JSON.stringify(validObject)],
        output: validObject,
        inputTokens: 160,
        outputTokens: 80,
      });
    },
  };
  requester.engine = mockEngine;

  const stream = requester.stream<{ value: number }>({
    messages: [{ role: "user", content: "give me a number" }],
    identifier: "test-cost-stream-reject",
    schema,
    tools: undefined,
    maxSteps: undefined,
    stageName: "test",
    settings: undefined,
  });

  const result = await stream.output;
  expect(result).toEqual(validObject);
  expect(callCount).toBeGreaterThanOrEqual(2);

  // Both attempts should have tracked tokens
  expect(addTokensCalls.length).toBe(2);
  expect(addTokensCalls[0]).toEqual({ input: 150, output: 75 });
  expect(addTokensCalls[1]).toEqual({ input: 160, output: 80 });
  expect(addCostCalls.length).toBe(2);

  await Deno.remove(ctx.debugDir, { recursive: true });
});
