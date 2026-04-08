import { expect } from "@std/expect";
import { Agent } from "./agent.ts";
import type { Tool, ModelMessage } from "ai";
import type { LlmRequester } from "../llm/llm.ts";
import type { McpClientWrapper } from "../mcp/client.ts";
import type { RunContext } from "../run-context/run-context.ts";
import type { HistoryCompactor } from "../llm-session-compactor/compactor.ts";

Deno.test("Agent", async (t) => {
  let llm: LlmRequester;
  let mcpClient: McpClientWrapper;
  let ctx: RunContext;
  let compactor: HistoryCompactor;

  const setup = () => {
    llm = (() => Promise.resolve({
      result: null,
      text: "Hello from LLM",
      estimatedCost: 0.01,
      inputTokens: 100,
      outputTokens: 50,
      newMessages: [{ role: "assistant", content: "Hello from LLM" }],
      steps: [],
    })) as unknown as LlmRequester;

    mcpClient = {
      connect: () => Promise.resolve(),
      getTools: () => Promise.resolve({
        "mcp__tool": {
          description: "A tool",
          parameters: {} as Record<string, unknown>,
          execute: () => Promise.resolve(),
        },
      }),
    } as unknown as McpClientWrapper;

    ctx = {
      runId: "test-run",
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      },
    } as unknown as RunContext;

    compactor = {
      compact: (msgs: readonly ModelMessage[]) => msgs,
      estimateSymbols: () => 10,
      // deno-lint-ignore no-explicit-any
    } as any;
  };

  await t.step("should initialize and aggregate tools", async () => {
    setup();
    let getToolsCalled = false;
    const originalGetTools = mcpClient.getTools;
    mcpClient.getTools = () => {
      getToolsCalled = true;
      return originalGetTools();
    };

    const agent = new Agent({
      llm,
      mcpClients: [mcpClient],
      ctx,
      systemPrompt: undefined,
      compactor: undefined,
      tools: undefined,
    });

    await agent.init();
    expect(getToolsCalled).toBe(true);
  });

  await t.step("should maintain chat history and call LLM", async () => {
    setup();
    let capturedMessages: unknown[] = [];
    const mockLlm = ((params: { messages: unknown[] }) => {
      capturedMessages = params.messages;
      return Promise.resolve({
        result: null,
        text: "Hello from LLM",
        newMessages: [{ role: "assistant", content: "Hello from LLM" }],
        steps: [],
        estimatedCost: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
    }) as unknown as LlmRequester;

    const agent = new Agent({
      llm: mockLlm,
      mcpClients: [],
      ctx,
      systemPrompt: "You are a helpful assistant.",
      compactor: undefined,
      tools: undefined,
    });

    await agent.init();
    const response = await agent.chat("Hi");

    expect(response).toBe("Hello from LLM");
    expect(capturedMessages).toContainEqual({ role: "system", content: "You are a helpful assistant." });
    expect(capturedMessages).toContainEqual({ role: "user", content: "Hi" });
  });

  await t.step("should use compactor when history grows", async () => {
    setup();
    let compactCalled = false;
    compactor.compact = (msgs: readonly ModelMessage[]) => {
      compactCalled = true;
      return msgs;
    };

    const agent = new Agent({
      llm,
      mcpClients: [],
      ctx,
      compactor,
      systemPrompt: undefined,
      tools: undefined,
    });

    await agent.init();
    await agent.chat("Message 1");
    
    expect(compactCalled).toBe(true);
  });

  await t.step("should accept and use local tools", async () => {
    setup();
    let capturedTools: Record<string, unknown> = {};
    const mockLlm = ((params: { tools: Record<string, unknown> }) => {
      capturedTools = params.tools;
      return Promise.resolve({
        result: null,
        text: "Using local tool",
        newMessages: [{ role: "assistant", content: "Using local tool" }],
        steps: [],
        estimatedCost: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
    }) as unknown as LlmRequester;

    const localTool = {
      description: "Local tool",
      parameters: { type: "object", properties: {} },
      execute: () => Promise.resolve(),
    };

    const agent = new Agent({
      llm: mockLlm as unknown as LlmRequester,
      ctx,
      tools: {
        "local_tool": localTool as unknown as Tool
      },
      mcpClients: undefined,
      systemPrompt: undefined,
      compactor: undefined,
    });

    await agent.init();
    await agent.chat("Use local tool");

    expect(capturedTools["local_tool"]).toBe(localTool);
  });
});
