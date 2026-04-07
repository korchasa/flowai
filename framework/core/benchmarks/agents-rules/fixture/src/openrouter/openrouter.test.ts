/**
 * Unit tests for createOpenRouterRequester and helper functions.
 * @module
 */

import { expect } from "@std/expect";
import { z } from "zod";
import { jsonSchema, type ModelMessage, type Tool } from "ai";
import { load as yamlLoad } from "js-yaml";

import type { OpenResponsesStreamEvent } from "@openrouter/sdk/models";

import {
  convertToOrMessages,
  convertToOrTools,
  createOpenRouterRequester,
  type OpenRouterEngine,
  type OpenRouterRequesterParams,
} from "./openrouter.ts";
import { ModelURI } from "../llm/llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

function makeLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  } as unknown as Logger;
}

function makeCostTracker(): CostTracker {
  return {
    addCost: () => {},
    addTokens: () => {},
    getReport: () => ({
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
    }),
  } as unknown as CostTracker;
}

function makeCtx(): RunContext {
  return {
    runId: "test-run-123",
    debugDir: "/tmp/test-debug",
    logger: makeLogger(),
    startTime: new Date(),
    saveDebugFile: () => Promise.resolve(),
  } as unknown as RunContext;
}

/** Build a minimal successful OpenResponsesNonStreamingResponse */
// deno-lint-ignore no-explicit-any
function makeResponse(content: string, usage?: { inputTokens: number; outputTokens: number; totalTokens: number; cost?: number }): any {
  const u = usage ?? { inputTokens: 10, outputTokens: 20, totalTokens: 30, cost: 0.001 };
  return {
    id: "resp-123",
    object: "response",
    createdAt: Date.now(),
    model: "openai/gpt-4o",
    status: "completed",
    completedAt: Date.now(),
    output: [
      {
        type: "message",
        id: "msg-1",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: content }],
      },
    ],
    outputText: content,
    error: null,
    incompleteDetails: null,
    usage: {
      inputTokens: u.inputTokens,
      outputTokens: u.outputTokens,
      totalTokens: u.totalTokens,
      inputTokensDetails: { cachedTokens: 0 },
      outputTokensDetails: { reasoningTokens: 0 },
      cost: u.cost ?? 0.001,
    },
    temperature: null,
    topP: null,
    presencePenalty: null,
    frequencyPenalty: null,
    metadata: null,
    tools: [],
    toolChoice: "auto",
    parallelToolCalls: false,
  };
}

/** Build an OpenResponsesNonStreamingResponse that requests a tool call */
// deno-lint-ignore no-explicit-any
function makeToolCallResponseOR(toolName: string, args: Record<string, unknown>, callId = "call-1"): any {
  return {
    id: "resp-456",
    object: "response",
    createdAt: Date.now(),
    model: "openai/gpt-4o",
    status: "completed",
    completedAt: Date.now(),
    output: [
      {
        type: "function_call",
        callId,
        name: toolName,
        arguments: JSON.stringify(args),
        status: "completed",
      },
    ],
    outputText: "",
    error: null,
    incompleteDetails: null,
    usage: {
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      inputTokensDetails: { cachedTokens: 0 },
      outputTokensDetails: { reasoningTokens: 0 },
      cost: 0.001,
    },
    temperature: null,
    topP: null,
    presencePenalty: null,
    frequencyPenalty: null,
    metadata: null,
    tools: [],
    toolChoice: "auto",
    parallelToolCalls: false,
  };
}

// ---------------------------------------------------------------------------
// convertToOrMessages
// ---------------------------------------------------------------------------

Deno.test("convertToOrMessages", async (t) => {
  await t.step("converts system message", () => {
    const msgs: ModelMessage[] = [{ role: "system", content: "You are helpful." }];
    const result = convertToOrMessages(msgs);
    expect(result).toEqual([{ role: "system", content: "You are helpful." }]);
  });

  await t.step("converts user message with string content", () => {
    const msgs: ModelMessage[] = [{ role: "user", content: "Hello" }];
    const result = convertToOrMessages(msgs);
    expect(result).toEqual([{ role: "user", content: "Hello" }]);
  });

  await t.step("converts user message with text content parts", () => {
    const msgs: ModelMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Part 1" },
          { type: "text", text: "Part 2" },
        ],
      },
    ];
    const result = convertToOrMessages(msgs);
    expect(result).toEqual([{ role: "user", content: "Part 1\nPart 2" }]);
  });

  await t.step("converts assistant message with string content", () => {
    const msgs: ModelMessage[] = [{ role: "assistant", content: "Answer" }];
    const result = convertToOrMessages(msgs);
    expect(result).toEqual([{ role: "assistant", content: "Answer" }]);
  });

  await t.step("converts assistant message with tool-call parts (v6 input field)", () => {
    const msgs: ModelMessage[] = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me check." },
          {
            type: "tool-call",
            toolCallId: "tc-1",
            toolName: "search",
            input: { query: "test" },
          },
        ],
      },
    ] as unknown as ModelMessage[];
    const result = convertToOrMessages(msgs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "assistant",
      content: "Let me check.",
      toolCalls: [
        {
          id: "tc-1",
          type: "function",
          function: { name: "search", arguments: '{"query":"test"}' },
        },
      ],
    });
  });

  await t.step("converts assistant message with tool-call parts (legacy args field)", () => {
    const msgs = [
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "tc-2",
            toolName: "fetch",
            args: { url: "https://example.com" },
          },
        ],
      },
    ] as unknown as ModelMessage[];
    const result = convertToOrMessages(msgs);
    expect(result[0]).toMatchObject({
      role: "assistant",
      toolCalls: [
        {
          id: "tc-2",
          type: "function",
          function: { name: "fetch", arguments: '{"url":"https://example.com"}' },
        },
      ],
    });
  });

  await t.step("converts tool result message into per-call messages (v6 output field)", () => {
    const msgs = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tc-1",
            toolName: "search",
            output: { type: "json", value: { hits: 5 } },
          },
          {
            type: "tool-result",
            toolCallId: "tc-2",
            toolName: "fetch",
            output: { type: "text", value: "raw text" },
          },
        ],
      },
    ] as unknown as ModelMessage[];
    const result = convertToOrMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      role: "tool",
      toolCallId: "tc-1",
    });
    expect(result[1]).toMatchObject({
      role: "tool",
      content: "raw text",
      toolCallId: "tc-2",
    });
  });

  await t.step("converts tool result message (legacy result field)", () => {
    const msgs = [
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tc-1",
            toolName: "search",
            result: { hits: 5 },
          },
        ],
      },
    ] as unknown as ModelMessage[];
    const result = convertToOrMessages(msgs);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      role: "tool",
      content: '{"hits":5}',
      toolCallId: "tc-1",
    });
  });
});

// ---------------------------------------------------------------------------
// convertToOrTools
// ---------------------------------------------------------------------------

Deno.test("convertToOrTools", async (t) => {
  await t.step("converts Record<string, Tool> using inputSchema (v6)", () => {
    const tools: Record<string, Tool> = {
      search: {
        description: "Search the web",
        inputSchema: z.object({ query: z.string() }),
        execute: ({ query }: { query: string }) => `Results for ${query}`,
      } as unknown as Tool,
    };
    const result = convertToOrTools(tools);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("function");
    expect(result[0].function.name).toBe("search");
    expect(result[0].function.description).toBe("Search the web");
    expect(result[0].function.parameters).toBeDefined();
    expect(result[0].function.parameters?.type).toBe("object");
  });

  await t.step("converts Record<string, Tool> using jsonSchema wrapped inputSchema", () => {
    const tools: Record<string, Tool> = {
      noop: {
        description: "No-op tool",
        inputSchema: jsonSchema({ type: "object", properties: { x: { type: "string" } } }),
        execute: () => "done",
      } as unknown as Tool,
    };
    const result = convertToOrTools(tools);
    expect(result).toHaveLength(1);
    expect(result[0].function.parameters).toBeDefined();
  });

  await t.step("handles tool without description", () => {
    const tools: Record<string, Tool> = {
      noop: {
        inputSchema: z.object({}),
      } as unknown as Tool,
    };
    const result = convertToOrTools(tools);
    expect(result).toHaveLength(1);
    expect(result[0].function.name).toBe("noop");
    expect(result[0].function.description).toBeUndefined();
  });

  await t.step("returns empty array for empty tools", () => {
    expect(convertToOrTools({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// createOpenRouterRequester - factory
// ---------------------------------------------------------------------------

Deno.test("createOpenRouterRequester - factory", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("returns a function", () => {
    const params: OpenRouterRequesterParams = {
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
    };
    const requester = createOpenRouterRequester(params);
    expect(typeof requester).toBe("function");
  });

  await t.step("has .stream property that is a function", () => {
    const params: OpenRouterRequesterParams = {
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
    };
    const requester = createOpenRouterRequester(params);
    expect(typeof requester.stream).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// createOpenRouterRequester - text generation
// ---------------------------------------------------------------------------

Deno.test("createOpenRouterRequester - text generation", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("sends correct model name from URI and returns text", async () => {
    const capturedRequests: unknown[] = [];
    const engine: OpenRouterEngine = {
      responseSend: (req) => {
        capturedRequests.push(req);
        return Promise.resolve(makeResponse("Hello world"));
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const result = await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-1",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    expect(capturedRequests).toHaveLength(1);
    const req = capturedRequests[0] as { model: string; input: unknown };
    expect(req.model).toBe("openai/gpt-4o");
    expect(req.input).toBeDefined();
    expect(result.text).toBe("Hello world");
    expect(result.result).toBeNull();
    expect(result.newMessages).toHaveLength(1);
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  await t.step("tracks input/output tokens from response", async () => {
    const engine: OpenRouterEngine = {
      responseSend: () =>
        Promise.resolve(makeResponse("ok", { inputTokens: 50, outputTokens: 100, totalTokens: 150, cost: 0.002 })),
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    const result = await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-2",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(100);
  });

  await t.step("passes settings (temperature, maxOutputTokens) to request", async () => {
    const capturedRequests: unknown[] = [];
    const engine: OpenRouterEngine = {
      responseSend: (req) => {
        capturedRequests.push(req);
        return Promise.resolve(makeResponse("ok"));
      },
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-3",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: { temperature: 0.5, maxOutputTokens: 200 },
    });
    const req = capturedRequests[0] as Record<string, unknown>;
    expect(req.temperature).toBe(0.5);
    expect(req.maxOutputTokens).toBe(200);
  });

  await t.step("extracts estimatedCost from usage.cost field", async () => {
    const engine: OpenRouterEngine = {
      responseSend: () =>
        Promise.resolve(makeResponse("ok", { inputTokens: 10, outputTokens: 20, totalTokens: 30, cost: 0.0042 })),
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    const result = await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-cost",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    expect(result.estimatedCost).toBeCloseTo(0.0042);
  });

  await t.step("calls costTracker.addCost with usage.cost value", async () => {
    let capturedCost: number | undefined;
    const trackerWithSpy: CostTracker = {
      addCost: (c: number) => { capturedCost = c; },
      addTokens: () => {},
      getReport: () => ({
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      }),
    } as unknown as CostTracker;

    const engine: OpenRouterEngine = {
      responseSend: () =>
        Promise.resolve(makeResponse("ok", { inputTokens: 5, outputTokens: 10, totalTokens: 15, cost: 0.0077 })),
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker: trackerWithSpy,
      ctx,
      engine,
    });
    await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-cost-tracker",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    expect(capturedCost).toBeCloseTo(0.0077);
  });
});

// ---------------------------------------------------------------------------
// createOpenRouterRequester - structured output
// ---------------------------------------------------------------------------

Deno.test("createOpenRouterRequester - structured output", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("parses and validates JSON response with Zod schema", async () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const engine: OpenRouterEngine = {
      responseSend: () => Promise.resolve(makeResponse('{"name":"Alice","age":30}')),
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    const result = await requester({
      messages: [{ role: "user", content: "Give me a person" }],
      identifier: "test-schema",
      schema,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    expect(result.result).toEqual({ name: "Alice", age: 30 });
  });

  await t.step("sends json_schema format in text.format when schema is provided", async () => {
    const capturedRequests: unknown[] = [];
    const schema = z.object({ value: z.string() });
    const engine: OpenRouterEngine = {
      responseSend: (req) => {
        capturedRequests.push(req);
        return Promise.resolve(makeResponse('{"value":"test"}'));
      },
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    await requester({
      messages: [{ role: "user", content: "Go" }],
      identifier: "test-rf",
      schema,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    const req = capturedRequests[0] as Record<string, unknown>;
    const text = req.text as { format: { type: string } };
    expect(text).toBeDefined();
    expect(text.format).toBeDefined();
    expect(text.format.type).toBe("json_schema");
  });

  await t.step("retries on schema validation failure and returns error", async () => {
    const schema = z.object({ value: z.number() });
    let callCount = 0;
    const engine: OpenRouterEngine = {
      responseSend: () => {
        callCount++;
        return Promise.resolve(makeResponse('{"value":"not-a-number"}')); // Always wrong type
      },
    };
    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });
    const result = await requester({
      messages: [{ role: "user", content: "Give value" }],
      identifier: "test-retry",
      schema,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });
    // Should retry MAX_RETRIES times total
    expect(callCount).toBeGreaterThan(1);
    expect(result.result).toBeNull();
    expect(result.validationError).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// createOpenRouterRequester - tool calling
// ---------------------------------------------------------------------------

Deno.test("createOpenRouterRequester - tool calling", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("executes a tool and sends result back", async () => {
    const responses = [
      makeToolCallResponseOR("search", { query: "Deno" }),
      makeResponse("Deno is great!"),
    ];
    let callCount = 0;
    const capturedRequests: unknown[] = [];

    const engine: OpenRouterEngine = {
      responseSend: (req) => {
        capturedRequests.push(req);
        return Promise.resolve(responses[callCount++]);
      },
    };

    const searchTool: Tool = {
      description: "Search the web",
      inputSchema: z.object({ query: z.string() }),
      execute: ({ query }: { query: string }) => `Results for: ${query}`,
    } as unknown as Tool;

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const result = await requester({
      messages: [{ role: "user", content: "Search for Deno" }],
      identifier: "test-tools",
      schema: undefined,
      tools: { search: searchTool },
      maxSteps: 5,
      stageName: "test",
      settings: undefined,
    });

    expect(callCount).toBe(2); // first call + tool result call
    expect(result.text).toBe("Deno is great!");

    // Second call should include tool result in input
    expect(capturedRequests).toHaveLength(2);
    const secondReq = capturedRequests[1] as { input: unknown };
    expect(secondReq.input).toBeDefined();
  });

  await t.step("respects maxSteps limit", async () => {
    let callCount = 0;
    const engine: OpenRouterEngine = {
      responseSend: () => {
        callCount++;
        // Always return function_call output - would loop forever without maxSteps
        return Promise.resolve(makeToolCallResponseOR("noop", {}));
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    await requester({
      messages: [{ role: "user", content: "Go" }],
      identifier: "test-maxsteps",
      schema: undefined,
      tools: {
        noop: {
          inputSchema: z.object({}),
          execute: () => "done",
        } as unknown as Tool,
      },
      maxSteps: 3,
      stageName: "test",
      settings: undefined,
    });

    expect(callCount).toBeLessThanOrEqual(3);
  });

  await t.step("populates toolCalls and toolResults in result", async () => {
    const responses = [
      makeToolCallResponseOR("calc", { x: 2, y: 3 }, "tc-abc"),
      makeResponse("The result is 5"),
    ];
    let callCount = 0;

    const engine: OpenRouterEngine = {
      responseSend: () => Promise.resolve(responses[callCount++]),
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const result = await requester({
      messages: [{ role: "user", content: "Calc 2+3" }],
      identifier: "test-toolresults",
      schema: undefined,
      tools: {
        calc: {
          inputSchema: z.object({ x: z.number(), y: z.number() }),
          execute: ({ x, y }: { x: number; y: number }) => x + y,
        } as unknown as Tool,
      },
      maxSteps: 5,
      stageName: "test",
      settings: undefined,
    });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].toolName).toBe("calc");
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults![0].result).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// createOpenRouterRequester - streaming (.stream)
// ---------------------------------------------------------------------------

/** Builds a mock async iterable of SSE stream events for text-only streaming. */
function makeMockStreamEvents(textChunks: string[], usage?: { inputTokens: number; outputTokens: number; cost?: number }): AsyncIterable<OpenResponsesStreamEvent> {
  // deno-lint-ignore no-explicit-any
  const events: any[] = [];

  for (const delta of textChunks) {
    events.push({
      type: "response.output_text.delta",
      delta,
      outputIndex: 0,
      itemId: "item-1",
      contentIndex: 0,
      sequenceNumber: events.length,
      logprobs: [],
    });
  }

  // response.completed carries usage
  events.push({
    type: "response.completed",
    sequenceNumber: events.length,
    response: {
      id: "resp-1",
      object: "response",
      createdAt: Date.now(),
      model: "openai/gpt-4o",
      status: "completed",
      completedAt: Date.now(),
      output: [
        {
          type: "message",
          id: "item-1",
          status: "completed",
          role: "assistant",
          content: [{ type: "output_text", text: textChunks.join(""), annotations: [] }],
        },
      ],
      error: null,
      incompleteDetails: null,
      usage: usage ? {
        inputTokens: usage.inputTokens,
        inputTokensDetails: { cachedTokens: 0 },
        outputTokens: usage.outputTokens,
        outputTokensDetails: { reasoningTokens: 0 },
        totalTokens: usage.inputTokens + usage.outputTokens,
        cost: usage.cost ?? 0,
      } : null,
      temperature: null,
      topP: null,
      presencePenalty: null,
      frequencyPenalty: null,
      metadata: null,
      tools: [],
      toolChoice: "auto",
      parallelToolCalls: true,
    },
  });

  async function* asyncIter() {
    for (const event of events) {
      yield event;
    }
  }

  return asyncIter();
}

Deno.test("createOpenRouterRequester - streaming", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("stream returns StreamResult with textStream", () => {
    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: () => Promise.resolve(makeMockStreamEvents(["Hello", " world"])),
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-stream-1",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    expect(streamResult).toBeDefined();
    expect(typeof streamResult.textStream[Symbol.asyncIterator]).toBe("function");
  });

  await t.step("stream yields text chunks from SSE events", async () => {
    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: () => Promise.resolve(makeMockStreamEvents(["Hello", " world"])),
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-stream-2",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    const chunks: string[] = [];
    for await (const chunk of streamResult.textStream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " world"]);
    expect(await streamResult.text).toBe("Hello world");
  });

  await t.step("stream resolves usage from response.completed event", async () => {
    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: () => Promise.resolve(makeMockStreamEvents(["Done"], { inputTokens: 42, outputTokens: 17, cost: 0.001 })),
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "test-stream-usage",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    // Consume stream first
    for await (const _ of streamResult.textStream) { /* consume */ }

    const usage = await streamResult.usage;
    expect(usage.inputTokens).toBe(42);
    expect(usage.outputTokens).toBe(17);
    const cost = await streamResult.estimatedCost;
    expect(cost).toBeCloseTo(0.001);
  });

  await t.step("stream with schema buffers and parses structured output", async () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: () => Promise.resolve(makeMockStreamEvents(['{"name":"Alice","age":30}'])),
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Give me a person" }],
      identifier: "test-stream-schema",
      schema,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    for await (const _ of streamResult.textStream) { /* consume */ }

    const output = await streamResult.output;
    expect(output).toEqual({ name: "Alice", age: 30 });
  });

  await t.step("stream executes tool calls and populates toolResults", async () => {
    // First call returns a tool call event, second returns text
    let callCount = 0;

    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: (_request) => {
        callCount++;
        if (callCount === 1) {
          // Stream that ends with a function_call output item
          // deno-lint-ignore no-explicit-any
          return Promise.resolve((async function* (): AsyncGenerator<any> {
            yield {
              type: "response.output_item.done",
              outputIndex: 0,
              sequenceNumber: 0,
              item: {
                type: "function_call",
                id: "call-1",
                callId: "call-1",
                name: "add",
                arguments: '{"x":2,"y":3}',
                status: "completed",
              },
            };
            yield {
              type: "response.completed",
              sequenceNumber: 1,
              response: {
                id: "resp-1",
                object: "response",
                createdAt: Date.now(),
                model: "openai/gpt-4o",
                status: "completed",
                completedAt: Date.now(),
                output: [
                  {
                    type: "function_call",
                    id: "call-1",
                    callId: "call-1",
                    name: "add",
                    arguments: '{"x":2,"y":3}',
                    status: "completed",
                  },
                ],
                error: null,
                incompleteDetails: null,
                usage: { inputTokens: 10, inputTokensDetails: { cachedTokens: 0 }, outputTokens: 5, outputTokensDetails: { reasoningTokens: 0 }, totalTokens: 15, cost: 0 },
                temperature: null, topP: null, presencePenalty: null, frequencyPenalty: null,
                metadata: null, tools: [], toolChoice: "auto", parallelToolCalls: true,
              },
            };
          })());
        } else {
          // After tool execution, return text
          return Promise.resolve(makeMockStreamEvents(["The answer is 5"]));
        }
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const addTool: Tool = {
      description: "Add two numbers",
      inputSchema: z.object({ x: z.number(), y: z.number() }),
      execute: ({ x, y }: { x: number; y: number }) => x + y,
    } as unknown as Tool;

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "What is 2+3?" }],
      identifier: "test-stream-tools",
      schema: undefined,
      tools: { add: addTool },
      maxSteps: 5,
      stageName: "test",
      settings: undefined,
    });

    for await (const _ of streamResult.textStream) { /* consume */ }

    const toolResults = await streamResult.toolResults;
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0].result).toBe(5);
    expect(await streamResult.text).toBe("The answer is 5");
  });
});

// ---------------------------------------------------------------------------
// OpenRouter streaming YAML debug file logging tests
// ---------------------------------------------------------------------------

function makeCtxWithDebugCapture() {
  const debugFileCalls: Array<{ filename: string; content: string | unknown; stageDir?: string }> = [];

  const ctx = {
    runId: "test-run-or-debug",
    debugDir: "/tmp/test-debug-or-streaming",
    logger: makeLogger(),
    startTime: new Date(),
    saveDebugFile: (params: { filename: string; content: string | unknown; stageDir?: string }) => {
      debugFileCalls.push(params);
      return Promise.resolve();
    },
  } as unknown as RunContext;

  return { ctx, debugFileCalls };
}

Deno.test("OpenRouter Streaming Debug - writes YAML debug file on success", async () => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const { ctx, debugFileCalls } = makeCtxWithDebugCapture();

  const engine: OpenRouterEngine = {
    responseSend: () => { throw new Error("should not be called"); },
    streamSend: () => Promise.resolve(makeMockStreamEvents(["Hello", " world"], { inputTokens: 30, outputTokens: 10, cost: 0.002 })),
  };

  const requester = createOpenRouterRequester({
    modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
    logger,
    costTracker,
    ctx,
    engine,
  });

  const streamResult = requester.stream({
    messages: [{ role: "user", content: "Hi" }],
    identifier: "or-debug-stream",
    schema: undefined,
    tools: undefined,
    maxSteps: undefined,
    stageName: "or-stage",
    settings: undefined,
  });

  // Consume stream
  for await (const _ of streamResult.textStream) { /* consume */ }
  await streamResult.text;
  await new Promise(r => setTimeout(r, 50));

  expect(debugFileCalls.length).toBe(1);
  const call = debugFileCalls[0];
  expect(call.filename).toContain("or-debug-stream");
  expect(call.filename.endsWith(".yaml")).toBe(true);
  expect(call.stageDir).toContain("or-stage");

  // Parse YAML and verify structure
  const yamlContent = typeof call.content === "string" ? call.content : String(call.content);
  // deno-lint-ignore no-explicit-any
  const parsed = yamlLoad(yamlContent) as any;
  expect(parsed.id).toContain("or-debug-stream");
  expect(parsed.model).toContain("openrouter/openai/gpt-4o");
  expect(parsed.stage).toBe("or-stage");
  expect(parsed.request).toBeDefined();
  expect(parsed.request.messages).toBeDefined();
  expect(parsed.request.messages.length).toBe(1);
  expect(parsed.attempts.length).toBe(1);

  const attempt = parsed.attempts[0];
  expect(attempt.attempt).toBe(1);
  expect(attempt.response).toBeDefined();
  expect(attempt.response.raw).toBe("Hello world");
  expect(attempt.stats).toBeDefined();
  expect(attempt.stats.tokens.input).toBe(30);
  expect(attempt.stats.tokens.output).toBe(10);
  expect(attempt.stats.cost).toBe(0.002);
});

Deno.test("OpenRouter Streaming Debug - writes YAML on error", async () => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const { ctx, debugFileCalls } = makeCtxWithDebugCapture();

  const engine: OpenRouterEngine = {
    responseSend: () => { throw new Error("should not be called"); },
    streamSend: () => Promise.reject(new Error("API connection failed")),
  };

  const requester = createOpenRouterRequester({
    modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
    logger,
    costTracker,
    ctx,
    engine,
  });

  const streamResult = requester.stream({
    messages: [{ role: "user", content: "Hi" }],
    identifier: "or-debug-error",
    schema: undefined,
    tools: undefined,
    maxSteps: undefined,
    stageName: "error-stage",
    settings: undefined,
  });

  // Consume stream — will finish with empty text due to error
  for await (const _ of streamResult.textStream) { /* consume */ }
  await streamResult.text;
  await new Promise(r => setTimeout(r, 50));

  expect(debugFileCalls.length).toBe(1);
  const yamlContent = typeof debugFileCalls[0].content === "string" ? debugFileCalls[0].content : String(debugFileCalls[0].content);
  // deno-lint-ignore no-explicit-any
  const parsed = yamlLoad(yamlContent) as any;
  expect(parsed.attempts.length).toBe(1);
  expect(parsed.attempts[0].error).toBeDefined();
  expect(parsed.attempts[0].error).toContain("API connection failed");
});

Deno.test("OpenRouter Streaming Debug - stageName is used in stageDir", async () => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const { ctx, debugFileCalls } = makeCtxWithDebugCapture();

  const engine: OpenRouterEngine = {
    responseSend: () => { throw new Error("should not be called"); },
    streamSend: () => Promise.resolve(makeMockStreamEvents(["ok"])),
  };

  const requester = createOpenRouterRequester({
    modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
    logger,
    costTracker,
    ctx,
    engine,
  });

  const streamResult = requester.stream({
    messages: [{ role: "user", content: "test" }],
    identifier: "or-debug-stage",
    schema: undefined,
    tools: undefined,
    maxSteps: undefined,
    stageName: "my-or-stage",
    settings: undefined,
  });

  for await (const _ of streamResult.textStream) { /* consume */ }
  await streamResult.text;
  await new Promise(r => setTimeout(r, 50));

  expect(debugFileCalls.length).toBe(1);
  expect(debugFileCalls[0].stageDir).toContain("my-or-stage");
});

// ---------------------------------------------------------------------------
// Timeout support
// ---------------------------------------------------------------------------

Deno.test("createOpenRouterRequester - timeout", async (t) => {
  const logger = makeLogger();
  const costTracker = makeCostTracker();
  const ctx = makeCtx();

  await t.step("non-streaming: aborts request after settings.timeout ms", async () => {
    const engine: OpenRouterEngine = {
      responseSend: (_req, signal) => {
        // Simulate a request that hangs until aborted
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          };
          if (signal?.aborted) {
            onAbort();
            return;
          }
          signal?.addEventListener("abort", onAbort);
        });
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test&maxValidationRetries=1"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const start = Date.now();
    try {
      await requester({
        messages: [{ role: "user", content: "Hi" }],
        identifier: "timeout-test-1",
        schema: undefined,
        tools: undefined,
        maxSteps: undefined,
        stageName: "test",
        settings: { timeout: 200 },
      });
      throw new Error("Expected request to be aborted");
    } catch (err) {
      const elapsed = Date.now() - start;
      expect(err).toBeInstanceOf(DOMException);
      expect((err as DOMException).name).toBe("AbortError");
      // Should abort close to 200ms; allow tolerance for CI
      expect(elapsed).toBeGreaterThanOrEqual(150);
      expect(elapsed).toBeLessThan(2000);
    }
  });

  await t.step("non-streaming: passes signal to responseSend (default 30s timeout)", async () => {
    let receivedSignal: AbortSignal | undefined;
    const engine: OpenRouterEngine = {
      responseSend: (_req, signal) => {
        receivedSignal = signal;
        return Promise.resolve(makeResponse("fast response"));
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "timeout-test-default",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: undefined,
    });

    // Signal should have been passed (not aborted since response was fast)
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(false);
  });

  await t.step("non-streaming: signal not aborted when response completes before timeout", async () => {
    let receivedSignal: AbortSignal | undefined;
    const engine: OpenRouterEngine = {
      responseSend: (_req, signal) => {
        receivedSignal = signal;
        return Promise.resolve(makeResponse("fast"));
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const result = await requester({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "timeout-test-no-abort",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: { timeout: 5000 },
    });

    expect(result.text).toBe("fast");
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(false);
  });

  await t.step("streaming: aborts stream after settings.timeout ms", async () => {
    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: (_req, signal) => {
        // Return a promise that hangs until aborted
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          };
          if (signal?.aborted) {
            onAbort();
            return;
          }
          signal?.addEventListener("abort", onAbort);
        });
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "timeout-stream-1",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: { timeout: 200 },
    });

    // The stream should error due to timeout; textStream finishes with empty/partial data
    const start = Date.now();
    const chunks: string[] = [];
    for await (const chunk of streamResult.textStream) {
      chunks.push(chunk);
    }

    // Wait for the text promise to settle
    await streamResult.text;

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(150);
    expect(elapsed).toBeLessThan(2000);
  });

  await t.step("streaming: passes signal to streamSend", async () => {
    let receivedSignal: AbortSignal | undefined;
    const engine: OpenRouterEngine = {
      responseSend: () => { throw new Error("should not be called"); },
      streamSend: (_req, signal) => {
        receivedSignal = signal;
        return Promise.resolve(makeMockStreamEvents(["ok"]));
      },
    };

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse("chat://openrouter/openai/gpt-4o?apiKey=test"),
      logger,
      costTracker,
      ctx,
      engine,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Hi" }],
      identifier: "timeout-stream-signal",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "test",
      settings: { timeout: 5000 },
    });

    for await (const _ of streamResult.textStream) { /* consume */ }
    await streamResult.text;

    expect(receivedSignal).toBeDefined();
    expect(receivedSignal!.aborted).toBe(false);
  });
});
