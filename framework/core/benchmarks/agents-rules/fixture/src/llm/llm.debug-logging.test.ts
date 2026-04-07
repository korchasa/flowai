import { expect } from "@std/expect";
import { createVercelRequester, ModelURI } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";

Deno.test("LLM Debug Logging", async (t) => {
  let logger: Logger;
  let costTracker: CostTracker;
  let ctx: RunContext;
  let debugLogs: string[] = [];
  let infoLogs: string[] = [];

  const setup = async () => {
    debugLogs = [];
    infoLogs = [];
    logger = {
      debug: (msg: string) => debugLogs.push(msg),
      info: (msg: string) => infoLogs.push(msg),
      warn: () => {},
      error: () => {},
    } as unknown as Logger;

    costTracker = {
      addCost: () => {},
      addTokens: () => {},
    } as unknown as CostTracker;

    ctx = {
      runId: "test-run-123",
      debugDir: await Deno.makeTempDir({ prefix: "test-debug-logging-" }),
      logger,
      startTime: new Date(),
    } as unknown as RunContext;
  };

  await t.step("should log request and response at debug level", async () => {
    await setup();
    
    // deno-lint-ignore no-explicit-any
    const mockEngine: any = {
      generateText: () => Promise.resolve({
        text: '{"result": "ok"}',
        output: { result: "ok" },
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        steps: [{ text: '{"result": "ok"}', output: { result: "ok" } }]
      }),
    };

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4?apiKey=test-key"),
      logger,
      costTracker,
      ctx
    });
    requester.engine = mockEngine;

    const schema = z.object({ result: z.string() });
    await requester({
      messages: [{ role: "user", content: "test prompt" }],
      identifier: "test-id",
      schema,
      stageName: "test-stage",
      tools: undefined,
      maxSteps: undefined,
      settings: undefined,
    });

    expect(debugLogs.some(log => log.includes("🚀 Request"))).toBe(true);
    expect(infoLogs.some(log => log.includes("✅ Response"))).toBe(true);

    // Cleanup
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
