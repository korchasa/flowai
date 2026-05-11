import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";
import type { Tool } from "ai";

Deno.test("LLM Tools Support", async (t) => {
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
    debugDir: await Deno.makeTempDir({ prefix: "test-tools-" }),
    logger,
    startTime: new Date(),
  } as unknown as RunContext;

  await t.step("should handle tool calls correctly", async () => {
    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: () => Promise.resolve({
        text: "Calling tool...",
        output: null,
        finishReason: "tool-calls",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        toolCalls: [{ toolCallId: "call-1", toolName: "test-tool", args: { arg1: "val1" } }],
        toolResults: [{ toolCallId: "call-1", toolName: "test-tool", args: { arg1: "val1" }, result: "tool-output" }],
        steps: [
          {
            text: "Calling tool...",
            toolCalls: [{ toolCallId: "call-1", toolName: "test-tool", args: { arg1: "val1" } }],
            toolResults: [{ toolCallId: "call-1", toolName: "test-tool", args: { arg1: "val1" }, result: "tool-output" }]
          }
        ]
        // deno-lint-ignore no-explicit-any
      } as any),
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
      logger,
      costTracker,
      ctx
    });
    requester.engine = mockEngine;

    const result = await requester({
      messages: [{ role: "user", content: "use tool" }],
      identifier: "test-id",
      schema: undefined,
      stageName: "test-stage",
      tools: {
        "test-tool": {
          description: "A test tool",
          parameters: z.object({ arg1: z.string() }),
          execute: () => Promise.resolve("tool-output")
        } as unknown as Tool,
      },
      maxSteps: 5,
      settings: undefined,
    });

    expect(result.toolCalls?.length).toBe(1);
    expect(result.toolCalls?.[0].toolName).toBe("test-tool");
    expect(result.toolResults?.length).toBe(1);
    expect(result.toolResults?.[0].result).toBe("tool-output");

    // Cleanup
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
