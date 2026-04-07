/**
 * Acceptance tests for createOpenRouterRequester using real OpenRouter API.
 * Only runs when OPENROUTER_API_KEY environment variable is set.
 *
 * @module
 */

import { expect } from "@std/expect";
import { z } from "zod";
import { jsonSchema, type Tool } from "ai";
import { createOpenRouterRequester } from "./openrouter.ts";
import { ModelURI } from "../llm/llm.ts";
import { createContextFromLevelString } from "../logger/logger.ts";
import { CostTracker } from "../cost-tracker/cost-tracker.ts";
import { createRunContext } from "../run-context/run-context.ts";
import "dotenv/config";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

// Fast, cheap model for acceptance tests
const TEST_MODEL = "chat://openrouter/openai/gpt-4o-mini";

Deno.test({
  name: "OpenRouter Acceptance: text generation",
  ignore: !OPENROUTER_API_KEY,
  async fn() {
    const logger = createContextFromLevelString({ context: "acceptance", level: "warn" });
    const costTracker = CostTracker.getInstance();
    const ctx = createRunContext({
      debugDir: await Deno.makeTempDir({ prefix: "or-acceptance-" }),
      logger,
    });

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse(TEST_MODEL),
      logger,
      costTracker,
      ctx,
    });

    const result = await requester({
      messages: [{ role: "user", content: "Say exactly: hello" }],
      identifier: "acceptance-text",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "acceptance",
      settings: { maxOutputTokens: 10 },
    });

    expect(result.text?.toLowerCase()).toContain("hello");
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
    expect(result.newMessages).toHaveLength(1);

    await Deno.remove(ctx.debugDir, { recursive: true });
  },
});

Deno.test({
  name: "OpenRouter Acceptance: structured output",
  ignore: !OPENROUTER_API_KEY,
  async fn() {
    const logger = createContextFromLevelString({ context: "acceptance", level: "warn" });
    const costTracker = CostTracker.getInstance();
    const ctx = createRunContext({
      debugDir: await Deno.makeTempDir({ prefix: "or-acceptance-schema-" }),
      logger,
    });

    const schema = z.object({
      language: z.string(),
      greeting: z.string(),
    });

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse(TEST_MODEL),
      logger,
      costTracker,
      ctx,
    });

    const result = await requester({
      messages: [
        { role: "user", content: 'Return a JSON with "language" = "English" and "greeting" = "Hello".' },
      ],
      identifier: "acceptance-schema",
      schema,
      tools: undefined,
      maxSteps: undefined,
      stageName: "acceptance",
      settings: { maxOutputTokens: 50 },
    });

    expect(result.result).not.toBeNull();
    expect(result.result?.language).toBe("English");
    expect(result.result?.greeting).toBe("Hello");

    await Deno.remove(ctx.debugDir, { recursive: true });
  },
});

Deno.test({
  name: "OpenRouter Acceptance: tool calling",
  ignore: !OPENROUTER_API_KEY,
  async fn() {
    const logger = createContextFromLevelString({ context: "acceptance", level: "warn" });
    const costTracker = CostTracker.getInstance();
    const ctx = createRunContext({
      debugDir: await Deno.makeTempDir({ prefix: "or-acceptance-tools-" }),
      logger,
    });

    const addTool: Tool = {
      description: "Add two numbers together",
      inputSchema: jsonSchema({
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" },
        },
        required: ["a", "b"],
      }),
      execute: ({ a, b }: { a: number; b: number }) => a + b,
    } as unknown as Tool;

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse(TEST_MODEL),
      logger,
      costTracker,
      ctx,
    });

    const result = await requester({
      messages: [
        { role: "user", content: "What is 7 + 5? Use the add tool to compute." },
      ],
      identifier: "acceptance-tools",
      schema: undefined,
      tools: { add: addTool },
      maxSteps: 5,
      stageName: "acceptance",
      settings: { maxOutputTokens: 100 },
    });

    // The model should have used the tool
    expect(result.toolResults?.length).toBeGreaterThan(0);
    expect(result.toolResults?.[0].result).toBe(12);

    await Deno.remove(ctx.debugDir, { recursive: true });
  },
});

Deno.test({
  name: "OpenRouter Acceptance: streaming text generation",
  ignore: !OPENROUTER_API_KEY,
  async fn() {
    const logger = createContextFromLevelString({ context: "acceptance", level: "warn" });
    const costTracker = CostTracker.getInstance();
    const ctx = createRunContext({
      debugDir: await Deno.makeTempDir({ prefix: "or-acceptance-stream-" }),
      logger,
    });

    const requester = createOpenRouterRequester({
      modelUri: ModelURI.parse(TEST_MODEL),
      logger,
      costTracker,
      ctx,
    });

    const streamResult = requester.stream({
      messages: [{ role: "user", content: "Say exactly: hello" }],
      identifier: "acceptance-stream",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "acceptance",
      settings: { maxOutputTokens: 20 },
    });

    const chunks: string[] = [];
    for await (const chunk of streamResult.textStream) {
      chunks.push(chunk);
    }

    const fullText = await streamResult.text;
    expect(fullText.toLowerCase()).toContain("hello");
    expect(chunks.length).toBeGreaterThan(0);

    const usage = await streamResult.usage;
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);

    await Deno.remove(ctx.debugDir, { recursive: true });
  },
});
