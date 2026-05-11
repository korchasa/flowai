import { expect } from "@std/expect";
import { createVercelRequester, ModelURI, type LlmEngine } from "./llm.ts";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { z } from "zod";
import { load as yamlLoad } from "js-yaml";
import { readFile } from "node:fs/promises";

Deno.test("LLM Raw Response Logging", async (t) => {
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
    debugDir: await Deno.makeTempDir({ prefix: "test-raw-response-" }),
    logger,
    startTime: new Date(),
    saveDebugFile: async (params: { filename: string; content: string; stageDir?: string }) => {
      const dir = params.stageDir ? `${ctx.debugDir}/${params.stageDir}` : ctx.debugDir;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(`${dir}/${params.filename}`, params.content);
    }
  } as unknown as RunContext;

  await t.step("should log raw response even on validation error", async () => {
    const rawText = '{"invalid": "json"';
    const mockEngine: LlmEngine = {
      streamText: () => ({}),
      generateText: () => Promise.resolve({
        text: rawText,
        output: null,
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        steps: [{ text: rawText, output: null }]
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

    const schema = z.object({ result: z.string() });
    try {
      await requester({
        messages: [{ role: "user", content: "test prompt" }],
        identifier: "test-id",
        schema,
        stageName: "test-stage",
        tools: undefined,
        maxSteps: undefined,
        settings: undefined,
      });
    } catch (_error) {
      // Expected validation error
    }

    // Find the log file
    const entries = [];
    const searchDir = `${ctx.debugDir}/test-stage`;
    for await (const entry of Deno.readDir(searchDir)) {
      if (entry.isFile && entry.name.endsWith(".yaml")) {
        entries.push(entry.name);
      }
    }
    expect(entries.length).toBe(1);

    const logContent = await readFile(`${searchDir}/${entries[0]}`, "utf-8");
    const logData = yamlLoad(logContent) as Record<string, unknown>;
    
    // deno-lint-ignore no-explicit-any
    const attempts = logData.attempts as Array<Record<string, any>>;
    expect(attempts[0].response.raw).toBe(rawText);

    // Cleanup
    await Deno.remove(ctx.debugDir, { recursive: true });
  });
});
