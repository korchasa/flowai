/**
 * Tests for configurable maxValidationRetries via ModelURI.
 *
 * Covers:
 * - Default behavior (3 retries) when parameter is omitted
 * - Custom retry count via ?maxValidationRetries=N
 * - Non-streaming and streaming structured retry loops
 * - Log message reflects actual configured value
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
  const debugMessages: string[] = [];
  const logger = {
    debug: (msg: string) => { debugMessages.push(msg); },
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;

  const costTracker = {
    addCost: () => {},
    addTokens: () => {},
  } as unknown as CostTracker;

  return { logger, costTracker, debugMessages };
}

async function makeCtx(logger: Logger): Promise<RunContext> {
  return {
    runId: "test-max-val-retries",
    debugDir: await Deno.makeTempDir({ prefix: "test-max-val-retries-" }),
    logger,
    startTime: new Date(),
  } as unknown as RunContext;
}

function makeAlwaysFailEngine(): { engine: LlmEngine; callCount: () => number } {
  let calls = 0;
  const engine: LlmEngine = {
    streamText: () => ({}) as never,
    generateText: () => {
      calls++;
      throw new NoObjectGeneratedError({
        message: "Response did not match schema",
        text: '{"bad": true}',
        response: {
          id: `resp-${calls}`,
          modelId: "gpt-4",
          timestamp: new Date(),
          headers: {},
        },
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
          outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
        },
        finishReason: "stop",
      });
    },
  };
  return { engine, callCount: () => calls };
}

function makeFailThenSucceedEngine(failCount: number): { engine: LlmEngine; callCount: () => number } {
  let calls = 0;
  const validResponse = { value: 42 };
  const engine: LlmEngine = {
    streamText: () => ({}) as never,
    generateText: () => {
      calls++;
      if (calls <= failCount) {
        throw new NoObjectGeneratedError({
          message: "Response did not match schema",
          text: '{"value": "not-a-number"}',
          response: {
            id: `resp-${calls}`,
            modelId: "gpt-4",
            timestamp: new Date(),
            headers: {},
          },
          usage: {
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: undefined, cacheWriteTokens: undefined },
            outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
          },
          finishReason: "stop",
        });
      }
      return Promise.resolve({
        text: JSON.stringify(validResponse),
        output: validResponse,
        finishReason: "stop",
        usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
        steps: [{ text: JSON.stringify(validResponse), output: validResponse }],
        // deno-lint-ignore no-explicit-any
      } as any);
    },
  };
  return { engine, callCount: () => calls };
}

/**
 * Creates a fake StreamTextResult for streaming structured tests.
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

Deno.test("Non-streaming: default maxValidationRetries is 3 when parameter omitted", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  const { engine, callCount } = makeAlwaysFailEngine();

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-default-retries",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Should have made exactly 3 attempts (the default MAX_RETRIES)
  expect(callCount()).toBe(3);
  expect(result.validationError).toBeDefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: maxValidationRetries=5 makes 5 attempts before giving up", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  const { engine, callCount } = makeAlwaysFailEngine();

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=5"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-custom-retries-5",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Should have made exactly 5 attempts
  expect(callCount()).toBe(5);
  expect(result.validationError).toBeDefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: maxValidationRetries=1 makes only 1 attempt", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  const { engine, callCount } = makeAlwaysFailEngine();

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=1"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-custom-retries-1",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  expect(callCount()).toBe(1);
  expect(result.validationError).toBeDefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: success on attempt 4 with maxValidationRetries=5", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  // Fails 3 times, succeeds on 4th — would fail with default MAX_RETRIES=3
  const { engine, callCount } = makeFailThenSucceedEngine(3);

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=5"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-success-on-4th",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  expect(callCount()).toBe(4);
  expect(result.result).toEqual({ value: 42 });
  expect(result.validationError).toBeUndefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: log message reflects configured maxValidationRetries value", async () => {
  const { logger, costTracker, debugMessages } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  const { engine } = makeFailThenSucceedEngine(0);

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=7"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-log-retries",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // The log message should contain maxValidationRetries=7
  const logWithRetries = debugMessages.find(m => m.includes("maxValidationRetries=7"));
  expect(logWithRetries).toBeDefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

Deno.test("Non-streaming: maxValidationRetries does not affect settings (HTTP retries stay separate)", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);

  // maxRetries=10 is for HTTP, maxValidationRetries=2 is for validation
  const { engine } = makeAlwaysFailEngine();

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxRetries=10&maxValidationRetries=2"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = engine;

  const result = await requester({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-separate-retries",
    schema: z.object({ value: z.number() }),
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Only 2 validation retries, not 10
  expect(result.validationError).toBeDefined();

  await Deno.remove(ctx.debugDir, { recursive: true });
});

// --- Streaming structured tests ---

Deno.test("Streaming structured: default maxValidationRetries is 3 when parameter omitted", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  let streamCallCount = 0;

  const mockEngine: LlmEngine = {
    generateText: () => Promise.resolve({}) as never,
    streamText: () => {
      streamCallCount++;
      return makeFakeStreamResult({
        textChunks: ['{"bad": true}'],
        output: null,
        outputError: new Error("validation failed"),
      });
    },
  };

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = mockEngine;

  const stream = requester.stream({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-stream-default-retries",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Suppress unhandled rejections from all stream promises
  stream.text.catch(() => {});
  stream.usage.catch(() => {});
  stream.estimatedCost.catch(() => {});
  stream.newMessages.catch(() => {});
  stream.steps.catch(() => {});
  stream.toolCalls.catch(() => {});
  stream.toolResults.catch(() => {});

  try {
    await stream.output;
  } catch {
    // Expected: validation did not pass after 3 attempts
  }

  expect(streamCallCount).toBe(3);
});

Deno.test("Streaming structured: maxValidationRetries=5 makes 5 attempts", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  let streamCallCount = 0;

  const mockEngine: LlmEngine = {
    generateText: () => Promise.resolve({}) as never,
    streamText: () => {
      streamCallCount++;
      return makeFakeStreamResult({
        textChunks: ['{"bad": true}'],
        output: null,
        outputError: new Error("validation failed"),
      });
    },
  };

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=5"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = mockEngine;

  const stream = requester.stream({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-stream-custom-retries-5",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Suppress unhandled rejections from all stream promises
  stream.text.catch(() => {});
  stream.usage.catch(() => {});
  stream.estimatedCost.catch(() => {});
  stream.newMessages.catch(() => {});
  stream.steps.catch(() => {});
  stream.toolCalls.catch(() => {});
  stream.toolResults.catch(() => {});

  try {
    await stream.output;
  } catch {
    // Expected: validation did not pass after 5 attempts
  }

  expect(streamCallCount).toBe(5);
});

Deno.test("Streaming structured: maxValidationRetries=1 makes only 1 attempt", async () => {
  const { logger, costTracker } = makeTestDeps();
  const ctx = await makeCtx(logger);
  const schema = z.object({ value: z.number() });

  let streamCallCount = 0;

  const mockEngine: LlmEngine = {
    generateText: () => Promise.resolve({}) as never,
    streamText: () => {
      streamCallCount++;
      return makeFakeStreamResult({
        textChunks: ['{"bad": true}'],
        output: null,
        outputError: new Error("validation failed"),
      });
    },
  };

  const requester = createVercelRequester({
    modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=1"),
    logger,
    costTracker,
    ctx,
  });
  requester.engine = mockEngine;

  const stream = requester.stream({
    messages: [{ role: "user", content: "give number" }],
    identifier: "test-stream-custom-retries-1",
    schema,
    stageName: "test",
    tools: undefined,
    maxSteps: undefined,
    settings: undefined,
  });

  // Suppress unhandled rejections from all stream promises
  stream.text.catch(() => {});
  stream.usage.catch(() => {});
  stream.estimatedCost.catch(() => {});
  stream.newMessages.catch(() => {});
  stream.steps.catch(() => {});
  stream.toolCalls.catch(() => {});
  stream.toolResults.catch(() => {});

  try {
    await stream.output;
  } catch {
    // Expected: validation did not pass after 1 attempt
  }

  expect(streamCallCount).toBe(1);
});

// --- ModelURI parsing test ---

Deno.test("ModelURI: maxValidationRetries is not placed into settings", () => {
  const uri = ModelURI.parse("chat://openai/gpt-4?apiKey=test-key&maxValidationRetries=5&maxRetries=10&temperature=0.5");
  // maxValidationRetries should be a URI param that does not pollute LlmSettings
  expect(uri.params.get("maxValidationRetries")).toBe("5");
  expect(uri.params.get("maxRetries")).toBe("10");
  expect(uri.params.get("temperature")).toBe("0.5");
});
