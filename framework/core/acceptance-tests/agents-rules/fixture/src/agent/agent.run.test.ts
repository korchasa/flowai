import { expect } from "@std/expect";
import { Agent } from "./agent.ts";
import type { LlmRequester } from "../llm/llm.ts";
import type { RunContext } from "../run-context/run-context.ts";

Deno.test("Agent.run and history preservation", async (t) => {
  const ctx = {
    runId: "test-run",
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  } as unknown as RunContext;

  await t.step("should preserve tool call history in the agent messages", async () => {
    const toolCallResult = {
      result: null,
      text: "",
      newMessages: [
        { role: "assistant", content: [{ type: "tool-call", toolCallId: "call-1", toolName: "get_data", args: {} }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "call-1", toolName: "get_data", result: "some data" }] },
        { role: "assistant", content: "Final answer with data" }
      ],
      steps: [],
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
    };

    const llm = (() => Promise.resolve(toolCallResult)) as unknown as LlmRequester;

    const agent = new Agent({
      llm,
      ctx,
      mcpClients: undefined,
      systemPrompt: undefined,
      compactor: undefined,
      tools: undefined,
    });

    await agent.init();
    const result = await agent.run("Get some data");

    expect(result).toEqual(toolCallResult);
    
    const history = agent.getHistory();
    expect(history).toHaveLength(4);
    expect(history[1].role).toBe("assistant");
    expect(history[2].role).toBe("tool");
    expect(history[3].role).toBe("assistant");
  });

  await t.step("chat() should use run() and return text", async () => {
    const finalResult = {
      result: null,
      text: "Hello",
      newMessages: [{ role: "assistant", content: "Hello" }],
      steps: [],
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
    };

    const llm = (() => Promise.resolve(finalResult)) as unknown as LlmRequester;

    const agent = new Agent({
      llm,
      ctx,
      mcpClients: undefined,
      systemPrompt: undefined,
      compactor: undefined,
      tools: undefined,
    });

    await agent.init();
    const text = await agent.chat("Hi");

    expect(text).toBe("Hello");
    expect(agent.getHistory()).toHaveLength(2);
  });
});
