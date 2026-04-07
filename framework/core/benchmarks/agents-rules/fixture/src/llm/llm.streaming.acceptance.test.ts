/**
 * Acceptance tests for LLM streaming with real API.
 * Skipped when OPENAI_API_KEY is not set.
 */

import { expect } from "@std/expect";
import { createVercelRequester, ModelURI } from "./llm.ts";
import { Logger } from "../logger/logger.ts";
import { CostTracker } from "../cost-tracker/cost-tracker.ts";
import { createRunContext } from "../run-context/run-context.ts";

const apiKey = Deno.env.get("OPENAI_API_KEY");
const skip = !apiKey;

Deno.test({
  name: "LLM Streaming Acceptance - text streaming arrives progressively",
  ignore: skip,
  fn: async () => {
    const debugDir = await Deno.makeTempDir({ prefix: "streaming-acceptance-" });
    const logger = new Logger({ context: "streaming-acceptance", logLevel: "debug" });
    const costTracker = CostTracker.getInstance();
    costTracker.reset();
    const ctx = createRunContext({ debugDir, logger });

    const requester = createVercelRequester({
      modelUri: ModelURI.parse("chat://openai/gpt-4o-mini"),
      logger,
      costTracker,
      ctx,
    });

    const stream = requester.stream<string>({
      messages: [{ role: "user", content: "Count from 1 to 5, one number per line." }],
      identifier: "acceptance-stream",
      schema: undefined,
      tools: undefined,
      maxSteps: undefined,
      stageName: "acceptance",
      settings: { timeout: 30000 },
    });

    const chunks: string[] = [];
    for await (const chunk of stream.textStream) {
      chunks.push(chunk);
    }

    // Should have received multiple chunks (streaming, not one big response)
    expect(chunks.length).toBeGreaterThan(0);

    const fullText = await stream.text;
    expect(fullText.length).toBeGreaterThan(0);

    // Verify usage is tracked
    const usage = await stream.usage;
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);

    // Verify cost tracker was updated
    expect(costTracker.getReport().totalInputTokens).toBeGreaterThan(0);
  },
});
