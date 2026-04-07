/**
 * Unit tests for Agent streaming methods (streamRun, streamChat).
 * Uses mocked LlmRequester.stream to avoid real API calls.
 */

import { expect } from "@std/expect";
import { Agent } from "./agent.ts";
import type { LlmRequester, StreamResult } from "../llm/llm.ts";
import type { RunContext } from "../run-context/run-context.ts";
import type { ModelMessage } from "ai";

// --- Helpers ---

function makeFakeStreamResult(chunks: string[]): StreamResult<unknown> {
  const fullText = chunks.join("");

  async function* makeTextStream() {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  // deno-lint-ignore no-explicit-any
  async function* makeFullStream(): AsyncIterable<any> {
    for (const chunk of chunks) {
      yield { type: "text-delta", textDelta: chunk };
    }
  }

  const newMessages: ModelMessage[] = [{ role: "assistant", content: fullText }];

  return {
    textStream: makeTextStream(),
    fullStream: makeFullStream(),
    text: Promise.resolve(fullText),
    output: Promise.resolve(null),
    toolCalls: Promise.resolve([]),
    toolResults: Promise.resolve([]),
    newMessages: Promise.resolve(newMessages),
    steps: Promise.resolve([]),
    usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
    estimatedCost: Promise.resolve(0),
  };
}

function makeTestDeps() {
  const ctx = {
    runId: "test-agent-stream",
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  } as unknown as RunContext;

  return { ctx };
}

// --- Tests ---

Deno.test("Agent Streaming - streamChat yields text chunks", async () => {
  const { ctx } = makeTestDeps();

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = (() => makeFakeStreamResult(["Hello", " ", "World"])) as unknown as typeof llm.stream;

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor: undefined, tools: undefined });

  const chunks: string[] = [];
  for await (const chunk of agent.streamChat("Hi")) {
    chunks.push(chunk);
  }

  expect(chunks).toEqual(["Hello", " ", "World"]);
});

Deno.test("Agent Streaming - streamRun returns StreamResult with all promises", async () => {
  const { ctx } = makeTestDeps();

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = (() => makeFakeStreamResult(["Test", " response"])) as unknown as typeof llm.stream;

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor: undefined, tools: undefined });

  const stream = await agent.streamRun("Question");

  expect(stream.textStream).toBeDefined();
  expect(stream.text).toBeInstanceOf(Promise);
  expect(stream.newMessages).toBeInstanceOf(Promise);

  const text = await stream.text;
  expect(text).toBe("Test response");
});

Deno.test("Agent Streaming - streamRun updates history after consuming newMessages", async () => {
  const { ctx } = makeTestDeps();

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = (() => makeFakeStreamResult(["Response text"])) as unknown as typeof llm.stream;

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor: undefined, tools: undefined });

  const historyBefore = agent.getHistory().length;
  const stream = await agent.streamRun("User message");

  // Before consuming newMessages, history hasn't been updated yet with assistant message
  // After consuming newMessages, it should be updated
  const newMsgs = await stream.newMessages;
  expect(newMsgs.length).toBeGreaterThan(0);

  // The agent's history should now include the user message + new messages
  const historyAfter = agent.getHistory();
  expect(historyAfter.length).toBeGreaterThan(historyBefore);

  // The user message should be in history
  const userMsg = historyAfter.find(m => m.role === "user" && typeof m.content === "string" && m.content === "User message");
  expect(userMsg).toBeDefined();
});

Deno.test("Agent Streaming - streamChat updates history after completion", async () => {
  const { ctx } = makeTestDeps();

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = (() => makeFakeStreamResult(["Hi there"])) as unknown as typeof llm.stream;

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor: undefined, tools: undefined });

  // Consume the full stream
  const chunks: string[] = [];
  for await (const chunk of agent.streamChat("Hello")) {
    chunks.push(chunk);
  }

  expect(chunks.join("")).toBe("Hi there");

  // History should be updated
  const history = agent.getHistory();
  const userMsg = history.find(m => m.role === "user");
  expect(userMsg).toBeDefined();
});

Deno.test("Agent Streaming - compactor is called before streaming", async () => {
  const { ctx } = makeTestDeps();

  let compactorCalled = false;

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = (() => makeFakeStreamResult(["ok"])) as unknown as typeof llm.stream;

  const compactor = {
    compact: (msgs: readonly ModelMessage[]) => {
      compactorCalled = true;
      return Promise.resolve([...msgs]);
    },
    estimateSymbols: () => 10,
    // deno-lint-ignore no-explicit-any
  } as any;

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor, tools: undefined });

  await agent.streamRun("test");
  expect(compactorCalled).toBe(true);
});

Deno.test("Agent Streaming - streamRun passes tools to LlmStreamer", async () => {
  const { ctx } = makeTestDeps();

  let capturedTools: Record<string, unknown> | undefined;

  const llm = (() => Promise.resolve({
    result: null,
    text: "",
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    newMessages: [],
    steps: [],
  })) as unknown as LlmRequester;

  llm.stream = ((params: { tools?: Record<string, unknown> }) => {
    capturedTools = params.tools;
    return makeFakeStreamResult(["ok"]);
  }) as unknown as typeof llm.stream;

  const tools = {
    myTool: {
      description: "A tool",
      parameters: {},
      execute: () => Promise.resolve("result"),
      // deno-lint-ignore no-explicit-any
    } as any,
  };

  const agent = new Agent({ llm, mcpClients: undefined, ctx, systemPrompt: undefined, compactor: undefined, tools });

  await agent.streamRun("use my tool");

  expect(capturedTools).toBeDefined();
  expect(capturedTools).toHaveProperty("myTool");
});
