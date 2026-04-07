/**
 * Stateful Agent module.
 * Manages conversation history, integrates MCP tools, and handles LLM interactions.
 *
 * @module
 */

import type { ModelMessage, Tool } from "ai";
import type { LlmRequester, GenerateResult, StreamResult } from "../llm/llm.ts";
import type { McpClientWrapper } from "../mcp/client.ts";
import type { RunContext } from "../run-context/run-context.ts";
import type { HistoryCompactor } from "../llm-session-compactor/compactor.ts";

export interface AgentParams {
  llm: LlmRequester;
  mcpClients: McpClientWrapper[] | undefined;
  ctx: RunContext;
  systemPrompt: string | undefined;
  compactor: HistoryCompactor | undefined;
  tools: Record<string, Tool> | undefined;
}

/**
 * Stateful Agent that manages conversation history, tools from MCP servers,
 * and LLM interactions.
 */
export class Agent {
  private messages: ModelMessage[] = [];
  private tools: Record<string, Tool> = {};
  private readonly llm: LlmRequester;
  private readonly mcpClients: McpClientWrapper[];
  private readonly ctx: RunContext;
  private readonly systemPrompt?: string;
  private readonly compactor?: HistoryCompactor;

  constructor(params: AgentParams) {
    this.llm = params.llm;
    this.mcpClients = params.mcpClients ?? [];
    this.ctx = params.ctx;
    this.systemPrompt = params.systemPrompt;
    this.compactor = params.compactor;
    this.tools = params.tools ?? {};

    if (this.systemPrompt) {
      this.messages.push({ role: "system", content: this.systemPrompt });
    }
  }

  /**
   * Initializes the agent by connecting to MCP servers and aggregating tools.
   */
  async init(): Promise<void> {
    this.ctx.logger.debug(`[Agent:${this.ctx.runId}] Initializing...`);
    const initialToolCount = Object.keys(this.tools).length;
    if (initialToolCount > 0) {
      this.ctx.logger.info(`[Agent] Initialized with ${initialToolCount} local tools`);
    }
    
    for (const client of this.mcpClients) {
      try {
        await client.connect();
        const clientTools = await client.getTools();
        Object.assign(this.tools, clientTools);
        this.ctx.logger.info(`[Agent] Aggregated ${Object.keys(clientTools).length} tools from MCP client`);
      } catch (error) {
        this.ctx.logger.error(`[Agent] Failed to initialize MCP client`, { error });
        // Depending on requirements, we might want to throw or just log and continue
      }
    }
  }

  /**
   * Sends a message to the agent and returns the full result.
   * This method preserves all intermediate tool calls and results in the history.
   *
   * @param input - The user message to process.
   * @returns A promise that resolves to the generation result.
   *
   * @example
   * ```ts
   * const result = await agent.run("What is the weather in Tokyo?");
   * console.log(result.text);
   * ```
   */
  async run(input: string): Promise<GenerateResult<unknown>> {
    this.ctx.logger.debug(`[Agent] User: ${input}`);
    
    // 1. Add user message
    this.messages.push({ role: "user", content: input });

    // 2. Compact history if needed
    if (this.compactor) {
      this.ctx.logger.debug(`[Agent] Compacting history...`);
      this.messages = [...(await this.compactor.compact(this.messages))];
    }

    // 3. Call LLM with messages + tools
    this.ctx.logger.debug(`[Agent] Calling LLM with ${this.messages.length} messages and ${Object.keys(this.tools).length} tools`);
    
    const response = await this.llm({
      messages: [...this.messages],
      tools: this.tools,
      maxSteps: 10, // Default max steps for tool loops
      identifier: `agent-chat-${Date.now()}`,
      stageName: "agent-chat",
      schema: undefined,
      settings: undefined,
    });

    if (response.validationError) {
      this.ctx.logger.error(`[Agent] LLM Error: ${response.validationError}`);
      throw new Error(`LLM Error: ${response.validationError}`);
    }

    // 4. Update history with all generated messages (including tool calls and results)
    if (response.newMessages && response.newMessages.length > 0) {
      this.messages.push(...response.newMessages);
    }

    return response;
  }

  /**
   * Sends a message to the agent and returns the text response.
   * Legacy method for backward compatibility.
   */
  async chat(input: string): Promise<string> {
    const response = await this.run(input);
    return response.text ?? "";
  }

  /**
   * Sends a message to the agent and returns a StreamResult for real-time streaming.
   *
   * The consumer MUST either consume the `textStream` fully OR await `newMessages`
   * (or any other final promise) before making the next call — this ensures history
   * is updated correctly.
   *
   * **Error behavior**: Unlike `run()`, which throws synchronously on `validationError`,
   * `streamRun()` does not perform an upfront validation check. If the stream fails
   * mid-way, the user message already added to history will remain (dangling). For
   * guaranteed history consistency on errors, prefer `streamChat()` which wraps the
   * stream iteration in `try/finally`.
   *
   * @param input - The user message to process.
   * @returns A StreamResult with async iterables and promise-based final values.
   *
   * @example
   * ```ts
   * const stream = await agent.streamRun("Tell me about Tokyo");
   * for await (const part of stream.fullStream) {
   *   if (part.type === "text-delta") process.stdout.write(part.textDelta);
   * }
   * const usage = await stream.usage;
   * ```
   */
  async streamRun(input: string): Promise<StreamResult<unknown>> {
    this.ctx.logger.debug(`[Agent] User (stream): ${input}`);

    // 1. Add user message
    this.messages.push({ role: "user", content: input });

    // 2. Compact history if needed
    if (this.compactor) {
      this.ctx.logger.debug(`[Agent] Compacting history before streaming...`);
      this.messages = [...(await this.compactor.compact(this.messages))];
    }

    // 3. Call LLM streamer
    this.ctx.logger.debug(
      `[Agent] Streaming with ${this.messages.length} messages and ${Object.keys(this.tools).length} tools`
    );

    const rawStream = this.llm.stream({
      messages: [...this.messages],
      tools: this.tools,
      maxSteps: 10,
      identifier: `agent-stream-${Date.now()}`,
      stageName: "agent-stream",
      schema: undefined,
      settings: undefined,
    });

    // 4. Wrap newMessages to also update agent history when resolved
    const wrappedNewMessages = rawStream.newMessages.then((msgs) => {
      if (msgs.length > 0) {
        this.messages.push(...msgs);
      }
      return msgs;
    });

    return { ...rawStream, newMessages: wrappedNewMessages };
  }

  /**
   * Sends a message to the agent and yields text chunks as they arrive.
   *
   * History is updated after the stream completes (i.e., after the generator is fully consumed).
   * If an error occurs during streaming, `newMessages` is still awaited in a `finally` block
   * to prevent dangling user messages in the conversation history.
   *
   * @param input - The user message to process.
   * @yields Text chunks as they arrive from the LLM.
   *
   * @example
   * ```ts
   * for await (const chunk of agent.streamChat("Tell me about Tokyo")) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  async *streamChat(input: string): AsyncGenerator<string> {
    const stream = await this.streamRun(input);
    try {
      for await (const chunk of stream.textStream) {
        yield chunk;
      }
    } finally {
      // Ensure history is updated even if streaming throws or is abandoned mid-way
      await stream.newMessages;
    }
  }

  /**
   * Returns the current conversation history.
   */
  getHistory(): ModelMessage[] {
    return [...this.messages];
  }
}
