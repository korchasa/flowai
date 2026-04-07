/**
 * Direct OpenRouter SDK integration module.
 *
 * Provides `createOpenRouterRequester()` that uses the official `@openrouter/sdk`
 * instead of the Vercel AI SDK abstraction layer, while producing the same
 * `GenerateResult<T>` / `StreamResult<T>` interfaces for drop-in compatibility with `Agent`.
 *
 * @module
 */

import { OpenRouter } from "@openrouter/sdk";
import type {
  ChatGenerationParams,
  ChatResponse,
  Message,
  ToolDefinitionJson,
} from "@openrouter/sdk/models";
import type {
  OpenResponsesNonStreamingResponse,
  OpenResponsesRequest,
  OpenResponsesStreamEvent,
} from "@openrouter/sdk/models";
import { fromChatMessages } from "@openrouter/sdk";
import { type z, toJSONSchema } from "zod";
import { dump as yamlDump } from "js-yaml";
import type { ModelMessage, Tool } from "ai";
import type { Logger } from "../logger/logger.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { getSubDebugDir } from "../run-context/run-context.ts";
import type {
  GenerateResult,
  LlmRequester,
  LlmRequesterParams,
  LlmSettings,
  LlmStreamer,
  StreamResult,
} from "../llm/llm.ts";
import { ModelURI } from "../llm/llm.ts";

// ---------------------------------------------------------------------------
// Engine interface for testability
// ---------------------------------------------------------------------------

/**
 * Interface for the underlying HTTP transport to allow mocking in tests.
 *
 * `responseSend` handles non-streaming requests via the OpenResponses API (includes cost in usage).
 * `streamSend` handles streaming requests and returns an async iterable of SSE events.
 *
 * Legacy `chatSend` is kept for backward compatibility but is no longer used by the requester.
 */
export interface OpenRouterEngine {
  /** @deprecated Use `responseSend` instead. Kept for backward compatibility. */
  chatSend?(params: ChatGenerationParams): Promise<ChatResponse>;
  /** Non-streaming request via OpenResponses API. Returns response with usage (including cost). */
  responseSend?(request: OpenResponsesRequest & { stream?: false }, signal?: AbortSignal): Promise<OpenResponsesNonStreamingResponse>;
  /** Returns an async iterable of OpenResponses SSE events. Typed as `unknown` to allow easy mocking. */
  // deno-lint-ignore no-explicit-any
  streamSend?: (request: OpenResponsesRequest & { stream: true }, signal?: AbortSignal) => Promise<AsyncIterable<any>>;
}

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

/**
 * Parameters for creating an OpenRouter requester.
 * Extends `LlmRequesterParams` with an optional test engine.
 */
export interface OpenRouterRequesterParams extends LlmRequesterParams {
  /** Optional engine override for tests. */
  readonly engine?: OpenRouterEngine;
}

// ---------------------------------------------------------------------------
// Internal types for YAML logging
// ---------------------------------------------------------------------------

interface YamlLogAttempt {
  readonly attempt: number;
  readonly timestamp: string;
  // deno-lint-ignore no-explicit-any
  readonly response?: { status: number; raw: string; parsed: any; steps?: unknown[]; error?: string };
  readonly stats?: { duration: number; cost: number; tokens: { input: number; output: number; total: number } };
  readonly error?: string;
}

interface YamlLogData {
  readonly id: string;
  readonly timestamp: string;
  readonly model: string;
  readonly stage: string;
  readonly settings: LlmSettings | undefined;
  // deno-lint-ignore no-explicit-any
  readonly request: { model: string; messages: any[] };
  readonly attempts: YamlLogAttempt[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_VALIDATION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

// ---------------------------------------------------------------------------
// Message conversion helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the JSON schema from a Vercel AI SDK `Tool.inputSchema`.
 *
 * The schema can be a Zod schema (v3) or a `jsonSchema()` wrapped object.
 * Returns a plain JSON schema object.
 */
// deno-lint-ignore no-explicit-any
function extractJsonSchema(inputSchema: unknown): Record<string, any> {
  if (!inputSchema) return { type: "object", properties: {} };

  // Zod schema: has `.safeParse` method
  if (typeof (inputSchema as z.ZodType).safeParse === "function") {
    // deno-lint-ignore no-explicit-any
    return toJSONSchema(inputSchema as z.ZodType<any>) as Record<string, any>;
  }

  // Vercel AI SDK `jsonSchema()` wrapper: has `jsonSchema` or `validate` property
  // The wrapped object stores the raw schema in `jsonSchema` property
  const wrapped = inputSchema as Record<string, unknown>;
  if (wrapped.jsonSchema && typeof wrapped.jsonSchema === "object") {
    return wrapped.jsonSchema as Record<string, unknown>;
  }

  // Fallback: assume it's already a plain JSON schema object
  return inputSchema as Record<string, unknown>;
}

/**
 * Converts Vercel AI SDK `ModelMessage[]` to OpenRouter `Message[]` format.
 *
 * Handles both Vercel AI SDK v6 format (`input`/`output`) and legacy v5 format
 * (`args`/`result`) for backward compatibility with messages stored by
 * the existing `createVercelRequester`.
 */
export function convertToOrMessages(messages: ModelMessage[]): Message[] {
  const result: Message[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      result.push({ role: "system", content: msg.content } as Message);
      continue;
    }

    if (msg.role === "user") {
      const content = typeof msg.content === "string"
        ? msg.content
        : (msg.content as Array<{ type: string; text?: string }>)
            .filter((p) => p.type === "text")
            .map((p) => p.text ?? "")
            .join("\n");
      result.push({ role: "user", content } as Message);
      continue;
    }

    if (msg.role === "assistant") {
      if (typeof msg.content === "string") {
        result.push({ role: "assistant", content: msg.content } as Message);
        continue;
      }

      const contentParts = msg.content as Array<Record<string, unknown>>;
      const textParts = contentParts
        .filter((p) => p.type === "text")
        .map((p) => (p.text as string) ?? "");

      const toolCallParts = contentParts.filter((p) => p.type === "tool-call");
      const toolCalls: ToolDefinitionJson[] = toolCallParts.length > 0
        ? toolCallParts.map((p) => ({
            id: p.toolCallId as string,
            type: "function" as const,
            function: {
              name: p.toolName as string,
              // v6 uses `input`, legacy uses `args`
              arguments: JSON.stringify(p.input ?? p.args ?? {}),
            },
          }))
        : undefined!;

      result.push({
        role: "assistant",
        content: textParts.join("\n") || null,
        ...(toolCallParts.length > 0 ? { toolCalls } : {}),
      } as unknown as Message);
      continue;
    }

    if (msg.role === "tool") {
      // Expand each tool result into a separate ToolResponseMessage
      const toolContent = msg.content as Array<Record<string, unknown>>;
      for (const part of toolContent) {
        if (part.type === "tool-result") {
          let content: string;

          // v6 format: output = { type: 'text', value } | { type: 'json', value }
          if (part.output && typeof part.output === "object") {
            const output = part.output as { type: string; value: unknown };
            if (output.type === "text") {
              content = String(output.value);
            } else if (output.type === "json") {
              content = typeof output.value === "string"
                ? output.value
                : JSON.stringify(output.value);
            } else {
              content = JSON.stringify(part.output);
            }
          } else if (part.result !== undefined) {
            // Legacy v5 format: result field
            content = typeof part.result === "string"
              ? part.result
              : JSON.stringify(part.result);
          } else {
            content = "";
          }

          result.push({
            role: "tool",
            content,
            toolCallId: part.toolCallId as string,
          } as Message);
        }
      }
    }
  }

  return result;
}

/**
 * Converts Vercel AI SDK `Record<string, Tool>` to OpenRouter `ToolDefinitionJson[]`.
 */
export function convertToOrTools(tools: Record<string, Tool>): ToolDefinitionJson[] {
  return Object.entries(tools).map(([name, tool]) => {
    const toolRecord = tool as unknown as Record<string, unknown>;
    const schema = extractJsonSchema(toolRecord.inputSchema ?? toolRecord.parameters);
    return {
      type: "function" as const,
      function: {
        name,
        ...(toolRecord.description ? { description: toolRecord.description as string } : {}),
        parameters: schema,
      },
    };
  });
}

/**
 * Converts Vercel AI SDK `Record<string, Tool>` to OpenResponses API tool format
 * (plain JSON schema, no Zod). Used for streaming requests via `beta.responses.send()`.
 */
function convertToOrRequestTools(
  tools: Record<string, Tool>,
): Array<{ type: "function"; name: string; description?: string; strict?: boolean; parameters: Record<string, unknown> | null }> {
  return Object.entries(tools).map(([name, tool]) => {
    const toolRecord = tool as unknown as Record<string, unknown>;
    const schema = extractJsonSchema(toolRecord.inputSchema ?? toolRecord.parameters);
    return {
      type: "function" as const,
      name,
      ...(toolRecord.description ? { description: toolRecord.description as string } : {}),
      parameters: schema,
    };
  });
}

// ---------------------------------------------------------------------------
// Tool execution helper
// ---------------------------------------------------------------------------

/**
 * Executes tool calls from an OpenRouter response.
 */
async function executeToolCalls(
  toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>,
  tools: Record<string, Tool>,
  messages: ModelMessage[],
): Promise<Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>> {
  const results: Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }> = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const tool = tools[toolName] as unknown as Record<string, unknown>;
    // deno-lint-ignore no-explicit-any
    let args: any;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = {};
    }

    if (!tool || typeof tool.execute !== "function") {
      results.push({
        toolCallId: toolCall.id,
        toolName,
        args,
        result: { error: `Tool "${toolName}" not found or not executable` },
      });
      continue;
    }

    try {
      // deno-lint-ignore no-explicit-any
      const result = await (tool.execute as (...a: any[]) => Promise<unknown>)(args, {
        toolCallId: toolCall.id,
        messages,
      });
      results.push({ toolCallId: toolCall.id, toolName, args, result });
    } catch (err) {
      results.push({
        toolCallId: toolCall.id,
        toolName,
        args,
        result: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Streaming helper — processes SSE events from beta.responses.send()
// ---------------------------------------------------------------------------

/**
 * Processes an async iterable of `OpenResponsesStreamEvent` into component streams
 * and promises suitable for `StreamResult<T>`.
 *
 * The function returns a `StreamResult<T>` immediately. Internally it fans out a
 * single shared async iterable into the required async iterables and promises by
 * consuming the event source once via a broadcast approach (one consumer with
 * value-sharing via resolved Promises).
 */
function buildStreamResult<T>(
  params: Readonly<{
    messages: ModelMessage[];
    identifier: string;
    schema: z.ZodType<T> | undefined;
    tools: Record<string, Tool> | undefined;
    maxSteps: number | undefined;
    // deno-lint-ignore no-explicit-any
    eventSource: (signal?: AbortSignal) => Promise<AsyncIterable<any>>;
    logger: Logger;
    ctx: RunContext;
    costTracker: { addCost(c: number): void; addTokens(i: number, o: number): void };
    stageName: string;
    maskedUri: string;
    settings: LlmSettings | undefined;
  }>
): StreamResult<T> {
  const { messages, schema, tools, maxSteps, eventSource, logger, ctx, costTracker, identifier, stageName, maskedUri, settings } = params;

  const startTime = Date.now();
  const logTimestamp = new Date().toISOString();
  const logId = `${identifier}-${Date.now()}`;

  // Build YAML log data for streaming debug file
  const streamYamlLogData: YamlLogData = {
    id: logId,
    timestamp: logTimestamp,
    model: maskedUri,
    stage: stageName,
    settings,
    request: {
      model: maskedUri,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : "[complex]",
      })),
    },
    attempts: [],
  };

  // Shared state resolved after stream consumption
  let resolveText!: (v: string) => void;
  let resolveOutput!: (v: T | null) => void;
  let resolveToolCalls!: (v: Array<{ toolCallId: string; toolName: string; args: unknown }>) => void;
  let resolveToolResults!: (v: Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>) => void;
  let resolveNewMessages!: (v: ModelMessage[]) => void;
  let resolveSteps!: (v: unknown[]) => void;
  let resolveUsage!: (v: { inputTokens: number; outputTokens: number }) => void;
  let resolveCost!: (v: number) => void;

  const textPromise = new Promise<string>((r) => { resolveText = r; });
  const outputPromise = new Promise<T | null>((r) => { resolveOutput = r; });
  const toolCallsPromise = new Promise<Array<{ toolCallId: string; toolName: string; args: unknown }>>((r) => { resolveToolCalls = r; });
  const toolResultsPromise = new Promise<Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>>((r) => { resolveToolResults = r; });
  const newMessagesPromise = new Promise<ModelMessage[]>((r) => { resolveNewMessages = r; });
  const stepsPromise = new Promise<unknown[]>((r) => { resolveSteps = r; });
  const usagePromise = new Promise<{ inputTokens: number; outputTokens: number }>((r) => { resolveUsage = r; });
  const costPromise = new Promise<number>((r) => { resolveCost = r; });

  // Text chunks pushed into an async generator via a shared queue
  const chunkQueue: string[] = [];
  let chunkDone = false;
  let chunkResolve: (() => void) | null = null;

  function pushChunk(chunk: string): void {
    chunkQueue.push(chunk);
    if (chunkResolve) {
      const r = chunkResolve;
      chunkResolve = null;
      r();
    }
  }

  function finishChunks(): void {
    chunkDone = true;
    if (chunkResolve) {
      const r = chunkResolve;
      chunkResolve = null;
      r();
    }
  }

  async function* textStreamGen(): AsyncIterable<string> {
    let idx = 0;
    while (true) {
      if (idx < chunkQueue.length) {
        yield chunkQueue[idx++];
      } else if (chunkDone) {
        break;
      } else {
        await new Promise<void>((r) => { chunkResolve = r; });
      }
    }
  }

  // Run the stream processing in the background
  (async () => {
    const allToolCallsAcc: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
    const allToolResultsAcc: Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }> = [];
    const newMessagesAcc: ModelMessage[] = [];

    let currentMessages = [...messages];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let fullText = "";

    const maxStepsUsed = maxSteps ?? (tools ? 5 : 1);

    // AbortController + settled-flag pattern for timeout (mirrors llm.ts).
    // A single timeout covers the entire stream from start to finish.
    const timeoutMs = settings?.timeout ?? 30000;
    const controller = new AbortController();
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      try {
        controller.abort();
      } catch (error) {
        logger.warn(`[OpenRouter] Error during stream controller.abort(): ${error instanceof Error ? error.message : String(error)}`);
      }
    }, timeoutMs);

    logger.debug(
      `[OpenRouter] [run:${ctx.runId}] [id:${identifier}] 🚀 Stream request: model=${maskedUri}, timeout=${timeoutMs}ms`,
    );

    try {
      for (let step = 0; step < maxStepsUsed; step++) {
        const eventIterable = await eventSource(controller.signal);

        // Collect SSE events for this step
        let stepText = "";
        let completedResponse: OpenResponsesNonStreamingResponse | null = null;
        const stepFunctionCalls: Array<{ callId: string; name: string; arguments: string }> = [];

        for await (const event of eventIterable) {
          const ev = event as Record<string, unknown>;
          const evType = ev.type as string;

          if (evType === "response.output_text.delta") {
            const delta = ev.delta as string;
            stepText += delta;
            // Only push chunks if no schema (structured output is replayed after validation)
            if (!schema) {
              pushChunk(delta);
            }
          } else if (evType === "response.output_item.done") {
            const item = ev.item as Record<string, unknown>;
            if (item?.type === "function_call") {
              stepFunctionCalls.push({
                callId: (item.callId ?? item.id) as string,
                name: item.name as string,
                arguments: item.arguments as string,
              });
            }
          } else if (evType === "response.completed") {
            completedResponse = (ev.response as OpenResponsesNonStreamingResponse);
          }
        }

        // Accumulate usage from the completed response
        if (completedResponse?.usage) {
          totalInputTokens += completedResponse.usage.inputTokens ?? 0;
          totalOutputTokens += completedResponse.usage.outputTokens ?? 0;
          totalCost += completedResponse.usage.cost ?? 0;
        }

        // If there are tool calls in this step, execute them and continue
        if (stepFunctionCalls.length > 0 && tools) {
          // Add assistant message with tool calls
          newMessagesAcc.push({
            role: "assistant",
            content: [
              ...(stepText ? [{ type: "text" as const, text: stepText }] : []),
              ...stepFunctionCalls.map((tc) => ({
                type: "tool-call" as const,
                toolCallId: tc.callId,
                toolName: tc.name,
                input: (() => {
                  try { return JSON.parse(tc.arguments); } catch { return {}; }
                })(),
              })),
            ],
          } as unknown as ModelMessage);

          // Execute tools
          const execResults = await executeToolCalls(
            stepFunctionCalls.map((tc) => ({
              id: tc.callId,
              type: "function",
              function: { name: tc.name, arguments: tc.arguments },
            })),
            tools,
            currentMessages,
          );

          for (const r of execResults) {
            allToolCallsAcc.push({ toolCallId: r.toolCallId, toolName: r.toolName, args: r.args });
            allToolResultsAcc.push(r);
          }

          // Add tool results to newMessages
          for (const r of execResults) {
            newMessagesAcc.push({
              role: "tool",
              content: [{
                type: "tool-result",
                toolCallId: r.toolCallId,
                toolName: r.toolName,
                result: r.result,
              }],
            } as unknown as ModelMessage);
          }

          // Prepare next iteration
          currentMessages = [...currentMessages, ...newMessagesAcc.slice(newMessagesAcc.length - execResults.length - 1)];
          continue;
        }

        // No tool calls — this is the final text response
        fullText += stepText;

        // For structured output: push the full text as one chunk after validation
        if (schema) {
          let parsedOutput: T | null = null;
          try {
            const parsed = JSON.parse(fullText);
            const zodResult = schema.safeParse(parsed);
            if (zodResult.success) {
              parsedOutput = zodResult.data;
              pushChunk(fullText);
            } else {
              logger.warn(`[OpenRouter] [run:${ctx.runId}] [id:${identifier}] ⚠️ Stream validation failed: ${zodResult.error.message}`);
              pushChunk(fullText); // push anyway as best-effort
            }
          } catch {
            pushChunk(fullText);
          }
          resolveOutput(parsedOutput);
        } else {
          resolveOutput(null);
        }

        newMessagesAcc.push({ role: "assistant", content: fullText });
        break;
      }

      logger.info(
        `[OpenRouter] [run:${ctx.runId}] [id:${identifier}] ✅ Stream complete: cost=$${totalCost.toFixed(6)}, tokens=${totalInputTokens + totalOutputTokens}`,
      );

      costTracker.addCost(totalCost);
      costTracker.addTokens(totalInputTokens, totalOutputTokens);

      // Write YAML debug file on success
      const duration = Date.now() - startTime;
      streamYamlLogData.attempts.push({
        attempt: 1,
        timestamp: new Date().toISOString(),
        response: { status: 200, raw: fullText, parsed: schema ? fullText : null },
        stats: {
          duration,
          cost: totalCost,
          tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens },
        },
      });
      await saveYamlLog({ ctx, stageName, logId, yamlLogData: streamYamlLogData, logger });

      resolveText(fullText);
      resolveToolCalls(allToolCallsAcc.length > 0 ? allToolCallsAcc : []);
      resolveToolResults(allToolResultsAcc.length > 0 ? allToolResultsAcc : []);
      resolveNewMessages(newMessagesAcc);
      resolveSteps([]);
      resolveUsage({ inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
      resolveCost(totalCost);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`[OpenRouter] [run:${ctx.runId}] [id:${identifier}] ❌ Stream error: ${errorMsg}`);

      // Track accumulated cost/tokens even on error
      costTracker.addCost(totalCost);
      costTracker.addTokens(totalInputTokens, totalOutputTokens);

      // Write YAML debug file on error
      const duration = Date.now() - startTime;
      streamYamlLogData.attempts.push({
        attempt: 1,
        timestamp: new Date().toISOString(),
        error: errorMsg,
        stats: {
          duration,
          cost: totalCost,
          tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens },
        },
      });
      await saveYamlLog({ ctx, stageName, logId, yamlLogData: streamYamlLogData, logger });

      // Resolve all promises with safe defaults so consumers don't hang
      resolveText(fullText);
      resolveOutput(null);
      resolveToolCalls([]);
      resolveToolResults([]);
      resolveNewMessages(newMessagesAcc);
      resolveSteps([]);
      resolveUsage({ inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
      resolveCost(totalCost);
    } finally {
      settled = true;
      clearTimeout(timeoutId);
      finishChunks();
    }
  })();

  return {
    textStream: textStreamGen(),
    // deno-lint-ignore no-explicit-any
    fullStream: (async function* () { /* not implemented */ })() as any,
    text: textPromise,
    output: outputPromise,
    toolCalls: toolCallsPromise,
    toolResults: toolResultsPromise,
    newMessages: newMessagesPromise,
    steps: stepsPromise,
    usage: usagePromise,
    estimatedCost: costPromise,
  };
}

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function sanitizeForYaml(obj: unknown, visited = new WeakSet()): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (visited.has(obj as object)) return "[Circular Reference]";
  if (obj instanceof Error) {
    return { name: obj.name, message: obj.message, stack: obj.stack };
  }
  visited.add(obj as object);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForYaml(item, visited));
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    result[key] = sanitizeForYaml(value, visited);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main factory function
// ---------------------------------------------------------------------------

/**
 * Creates an `LlmRequester`-compatible function that uses the official
 * `@openrouter/sdk` for direct OpenRouter API access, bypassing Vercel AI SDK.
 *
 * The returned function has a `.stream` property implementing `LlmStreamer`
 * for real-time SSE streaming via the OpenResponses API.
 *
 * @example
 * ```ts
 * const requester = createOpenRouterRequester({
 *   modelUri: ModelURI.parse("openrouter/openai/gpt-4o"),
 *   logger,
 *   costTracker,
 *   ctx,
 * });
 *
 * // Non-streaming
 * const result = await requester({ messages, identifier, schema, tools, maxSteps, stageName, settings });
 *
 * // Streaming
 * const stream = requester.stream({ messages, identifier, schema, tools, maxSteps, stageName, settings });
 * for await (const chunk of stream.textStream) { process.stdout.write(chunk); }
 * ```
 */
export function createOpenRouterRequester(
  params: OpenRouterRequesterParams,
): LlmRequester {
  const { modelUri, logger, costTracker, ctx, engine: providedEngine } = params;

  const apiKey = modelUri.params.get("apiKey") ?? Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const baseURL = modelUri.params.get("baseURL");
  const maskedUri = modelUri.toString();
  const modelName = modelUri.modelName; // e.g. "openai/gpt-4o"

  // Parse maxValidationRetries from URI (controls schema validation retry count)
  const maxValidationRetriesRaw = modelUri.params.get("maxValidationRetries");
  const maxValidationRetries = maxValidationRetriesRaw
    ? (Number(maxValidationRetriesRaw) >= 1 ? Number(maxValidationRetriesRaw) : DEFAULT_MAX_VALIDATION_RETRIES)
    : DEFAULT_MAX_VALIDATION_RETRIES;

  // Build engine (real or injected for tests)
  const engine: OpenRouterEngine = providedEngine ?? {
    responseSend: async (request: OpenResponsesRequest & { stream?: false }, signal?: AbortSignal): Promise<OpenResponsesNonStreamingResponse> => {
      const client = new OpenRouter({
        apiKey,
        ...(baseURL ? { serverURL: baseURL } : {}),
      });
      // The Deno-cached version expects { openResponsesRequest: ... } wrapper
      // deno-lint-ignore no-explicit-any
      const response = await (client.beta.responses as any).send(
        { openResponsesRequest: { ...request, stream: false } },
        signal ? { signal } : undefined,
      );
      return response as OpenResponsesNonStreamingResponse;
    },
    streamSend: async (request: OpenResponsesRequest & { stream: true }, signal?: AbortSignal): Promise<AsyncIterable<OpenResponsesStreamEvent>> => {
      const client = new OpenRouter({
        apiKey,
        ...(baseURL ? { serverURL: baseURL } : {}),
      });
      // The Deno-cached version of betaResponsesSend.js expects { openResponsesRequest: ... } wrapper
      // deno-lint-ignore no-explicit-any
      const eventStream = await (client.beta.responses as any).send(
        { openResponsesRequest: request },
        signal ? { signal } : undefined,
      );
      return eventStream as AsyncIterable<OpenResponsesStreamEvent>;
    },
  };

  // ---------------------------------------------------------------------------
  // Non-streaming requester (uses OpenResponses API for cost tracking)
  // ---------------------------------------------------------------------------

  if (!engine.responseSend) {
    throw new Error("[OpenRouter] Engine must implement responseSend for non-streaming requests.");
  }
  const responseSendFn = engine.responseSend;

  const requester = async <T>(
    reqParams: Readonly<{
      messages: ModelMessage[];
      identifier: string;
      schema: z.ZodType<T> | undefined;
      tools: Record<string, Tool> | undefined;
      maxSteps: number | undefined;
      stageName: string;
      settings: LlmSettings | undefined;
    }>,
  ): Promise<GenerateResult<T>> => {
    const { messages, identifier, schema, tools, maxSteps, stageName, settings } = reqParams;

    const logId = `${identifier}-${Date.now()}`;
    const logTimestamp = new Date().toISOString();

    const yamlLogData: YamlLogData = {
      id: logId,
      timestamp: logTimestamp,
      model: maskedUri,
      stage: stageName,
      settings,
      request: {
        model: modelName,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "[complex]",
        })),
      },
      attempts: [],
    };

    // Mutable state for the request loop
    let currentMessages = [...messages];
    const allToolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
    const allToolResults: Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }> = [];
    const newMessages: ModelMessage[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;

    // Retry loop for validation errors
    let lastValidationError: string | undefined;
    let lastRawResponse: string | undefined;

    for (let attempt = 1; attempt <= maxValidationRetries; attempt++) {
      const attemptTimestamp = new Date().toISOString();
      const attemptStart = Date.now();

      const timeoutMs = settings?.timeout ?? 30000;
      logger.debug(
        `[OpenRouter] [run:${ctx.runId}] [id:${identifier}:${attempt}] 🚀 Request: model=${maskedUri}, timeout=${timeoutMs}ms, attempt=${attempt}`,
      );

      try {
        // Tool execution loop within this attempt
        const orRequestTools = tools ? convertToOrRequestTools(tools) : undefined;

        const maxStepsUsed = maxSteps ?? (tools ? 5 : 1);
        let stepCount = 0;
        let lastResponse: OpenResponsesNonStreamingResponse | null = null;

        // Build initial input from messages.
        // orInput is the native OpenResponses input format (user/assistant/function_call/function_call_output items).
        // We mutate it directly during tool loops instead of round-tripping through convertToOrMessages + fromChatMessages,
        // because fromChatMessages loses function_call items (produces empty assistant messages instead).
        const orMessages = convertToOrMessages(currentMessages);
        // deno-lint-ignore no-explicit-any
        const orInputRaw = fromChatMessages(orMessages as any);
        // Ensure orInput is always an array (fromChatMessages can return string for simple prompts)
        // deno-lint-ignore no-explicit-any
        const orInput: any[] = typeof orInputRaw === "string" ? [{ role: "user", content: orInputRaw }] : orInputRaw as any[];

        while (stepCount < maxStepsUsed) {
          stepCount++;

          // Build OpenResponses request
          const request: OpenResponsesRequest & { stream?: false } = {
            model: modelName,
            // deno-lint-ignore no-explicit-any
            input: orInput as any,
            stream: false as const,
            ...(orRequestTools && orRequestTools.length > 0 ? { tools: orRequestTools } : {}),
            ...(schema
              ? {
                  text: {
                    format: {
                      type: "json_schema" as const,
                      name: "response",
                      schema: toJSONSchema(schema) as Record<string, unknown>,
                      strict: true,
                    },
                  },
                }
              : {}),
            ...(settings?.temperature !== undefined ? { temperature: settings.temperature } : {}),
            ...(settings?.maxOutputTokens !== undefined ? { maxOutputTokens: settings.maxOutputTokens } : {}),
            ...(settings?.topP !== undefined ? { topP: settings.topP } : {}),
            ...(settings?.frequencyPenalty !== undefined ? { frequencyPenalty: settings.frequencyPenalty } : {}),
            ...(settings?.presencePenalty !== undefined ? { presencePenalty: settings.presencePenalty } : {}),
          };

          // AbortController + settled-flag pattern for timeout (mirrors llm.ts).
          // See GitHub issue #6 for rationale on the 3-layer defense.
          const controller = new AbortController();
          let settled = false;
          const timeoutId = setTimeout(() => {
            if (settled) return;
            try {
              controller.abort();
            } catch (error) {
              logger.warn(`[OpenRouter] Error during controller.abort(): ${error instanceof Error ? error.message : String(error)}`);
            }
          }, timeoutMs);

          let response: OpenResponsesNonStreamingResponse;
          try {
            response = await responseSendFn(request, controller.signal);
          } finally {
            settled = true;
            clearTimeout(timeoutId);
          }
          lastResponse = response;

          // Accumulate token usage and cost from OpenResponses API
          const usage = response.usage;
          if (usage) {
            totalInputTokens += usage.inputTokens ?? 0;
            totalOutputTokens += usage.outputTokens ?? 0;
            totalCost += usage.cost ?? 0;
          }

          // Extract text and function calls from output items
          let stepText = "";
          const stepFunctionCalls: Array<{ callId: string; name: string; arguments: string }> = [];

          for (const item of response.output) {
            if (item.type === "message") {
              // Extract text from message content
              for (const part of (item as { content: Array<{ type: string; text?: string }> }).content) {
                if (part.type === "output_text" && part.text) {
                  stepText += part.text;
                }
              }
            } else if (item.type === "function_call") {
              const fc = item as { callId: string; name: string; arguments: string };
              stepFunctionCalls.push({
                callId: fc.callId,
                name: fc.name,
                arguments: fc.arguments,
              });
            }
          }

          // Fallback: use outputText convenience field if no text found in output items
          if (!stepText && response.outputText) {
            stepText = response.outputText;
          }

          lastRawResponse = stepText;

          // Check for tool calls
          if (stepFunctionCalls.length > 0 && tools) {
            // Record assistant message with tool calls in newMessages
            newMessages.push({
              role: "assistant",
              content: [
                ...(stepText ? [{ type: "text" as const, text: stepText }] : []),
                ...stepFunctionCalls.map((tc) => ({
                  type: "tool-call" as const,
                  toolCallId: tc.callId,
                  toolName: tc.name,
                  input: (() => {
                    try { return JSON.parse(tc.arguments); } catch { return {}; }
                  })(),
                })),
              ],
            } as unknown as ModelMessage);

            // Execute tools
            const execResults = await executeToolCalls(
              stepFunctionCalls.map((tc) => ({
                id: tc.callId,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
              tools,
              currentMessages,
            );

            // Accumulate tool calls/results for the final GenerateResult
            for (const r of execResults) {
              allToolCalls.push({ toolCallId: r.toolCallId, toolName: r.toolName, args: r.args });
              allToolResults.push(r);
            }

            // Build tool result messages and add to newMessages
            for (const r of execResults) {
              newMessages.push({
                role: "tool",
                content: [{
                  type: "tool-result",
                  toolCallId: r.toolCallId,
                  toolName: r.toolName,
                  result: r.result,
                }],
              } as unknown as ModelMessage);
            }

            // Append function_call + function_call_output items directly to orInput
            // (OpenResponses API requires: function_call item followed by function_call_output item)
            for (const tc of stepFunctionCalls) {
              orInput.push({
                type: "function_call",
                callId: tc.callId,
                name: tc.name,
                arguments: tc.arguments,
              });
            }
            for (const r of execResults) {
              const resultStr = typeof r.result === "string" ? r.result : JSON.stringify(r.result);
              orInput.push({
                type: "function_call_output",
                callId: r.toolCallId,
                output: resultStr,
              });
            }

            continue; // Next step
          }

          // No more tool calls — we have the final response
          break;
        }

        if (!lastResponse) {
          throw new Error("No response received from OpenRouter API");
        }

        const finalText = lastRawResponse ?? lastResponse.outputText ?? "";

        // Add final assistant message to newMessages
        newMessages.push({ role: "assistant", content: finalText });

        const duration = Date.now() - attemptStart;

        // Try to parse structured output if schema provided
        let parsedResult: T | null = null;
        let validationError: string | undefined;

        if (schema) {
          try {
            const parsed = JSON.parse(finalText);
            const zodResult = schema.safeParse(parsed);
            if (zodResult.success) {
              parsedResult = zodResult.data;
            } else {
              validationError = zodResult.error.message;
              lastValidationError = validationError;

              const attemptLog: YamlLogAttempt = {
                attempt,
                timestamp: attemptTimestamp,
                response: { status: 200, raw: finalText, parsed: null, error: validationError },
                stats: {
                  duration,
                  cost: totalCost,
                  tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens },
                },
              };
              yamlLogData.attempts.push(attemptLog);

              logger.warn(
                `[OpenRouter] [run:${ctx.runId}] [id:${identifier}:${attempt}] ⚠️ Validation failed: ${validationError}`,
              );

              if (attempt < maxValidationRetries) {
                // Self-correction: add error message for retry
                currentMessages = [
                  ...currentMessages,
                  { role: "assistant", content: finalText } as ModelMessage,
                  {
                    role: "user",
                    content: `Your previous response failed validation. Error: ${validationError}\n\nPlease fix your response and ensure it matches the required schema.`,
                  } as ModelMessage,
                ];
                await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
                continue;
              }

              // Exhausted retries — return with validation error
              costTracker.addCost(totalCost);
              costTracker.addTokens(totalInputTokens, totalOutputTokens);
              await saveYamlLog({ ctx, stageName, logId, yamlLogData, logger });

              return {
                result: null,
                text: finalText,
                toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
                toolResults: allToolResults.length > 0 ? allToolResults : undefined,
                newMessages,
                steps: [],
                estimatedCost: totalCost,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                validationError: lastValidationError,
                rawResponse: lastRawResponse,
              };
            }
          } catch (parseErr) {
            validationError = `JSON parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`;
            lastValidationError = validationError;

            const attemptLog: YamlLogAttempt = {
              attempt,
              timestamp: attemptTimestamp,
              response: { status: 200, raw: finalText, parsed: null, error: validationError },
              stats: {
                duration,
                cost: totalCost,
                tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens },
              },
            };
            yamlLogData.attempts.push(attemptLog);

            if (attempt < maxValidationRetries) {
              currentMessages = [
                ...currentMessages,
                { role: "assistant", content: finalText } as ModelMessage,
                {
                  role: "user",
                  content: `Your previous response was not valid JSON. Error: ${validationError}\n\nPlease provide a valid JSON response.`,
                } as ModelMessage,
              ];
              await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
              continue;
            }

            costTracker.addCost(totalCost);
            costTracker.addTokens(totalInputTokens, totalOutputTokens);
            await saveYamlLog({ ctx, stageName, logId, yamlLogData, logger });

            return {
              result: null,
              text: finalText,
              toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
              toolResults: allToolResults.length > 0 ? allToolResults : undefined,
              newMessages,
              steps: [],
              estimatedCost: totalCost,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              validationError: lastValidationError,
              rawResponse: lastRawResponse,
            };
          }
        }

        // Success
        const tokens = totalInputTokens + totalOutputTokens;
        const attemptLog: YamlLogAttempt = {
          attempt,
          timestamp: attemptTimestamp,
          response: { status: 200, raw: finalText, parsed: parsedResult },
          stats: {
            duration,
            cost: totalCost,
            tokens: { input: totalInputTokens, output: totalOutputTokens, total: tokens },
          },
        };
        yamlLogData.attempts.push(attemptLog);

        logger.info(
          `[OpenRouter] [run:${ctx.runId}] [id:${identifier}:${attempt}] ✅ Response: status=200, duration=${duration}ms, cost=$${totalCost.toFixed(6)}, tokens=${tokens}`,
        );

        costTracker.addCost(totalCost);
        costTracker.addTokens(totalInputTokens, totalOutputTokens);
        await saveYamlLog({ ctx, stageName, logId, yamlLogData, logger });

        return {
          result: parsedResult,
          text: finalText,
          toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
          toolResults: allToolResults.length > 0 ? allToolResults : undefined,
          newMessages,
          steps: [],
          estimatedCost: totalCost,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          validationError: undefined,
          rawResponse: lastRawResponse,
        };
      } catch (err) {
        const duration = Date.now() - attemptStart;
        const errorMsg = err instanceof Error ? err.message : String(err);

        const attemptLog: YamlLogAttempt = {
          attempt,
          timestamp: attemptTimestamp,
          stats: { duration, cost: totalCost, tokens: { input: totalInputTokens, output: totalOutputTokens, total: totalInputTokens + totalOutputTokens } },
          error: errorMsg,
        };
        yamlLogData.attempts.push(attemptLog);

        logger.error(
          `[OpenRouter] [run:${ctx.runId}] [id:${identifier}:${attempt}] ❌ Error: ${errorMsg}`,
        );

        if (attempt < maxValidationRetries) {
          await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1));
          continue;
        }

        // Track accumulated cost/tokens even on final error
        costTracker.addCost(totalCost);
        costTracker.addTokens(totalInputTokens, totalOutputTokens);
        await saveYamlLog({ ctx, stageName, logId, yamlLogData, logger });
        throw err;
      }
    }

    // Should not reach here, but TypeScript requires a return
    return {
      result: null,
      text: "",
      newMessages,
      steps: [],
      estimatedCost: totalCost,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      validationError: lastValidationError,
      rawResponse: lastRawResponse,
    };
  };

  // ---------------------------------------------------------------------------
  // Streaming requester
  // ---------------------------------------------------------------------------

  const streamer: LlmStreamer = <T>(
    reqParams: Readonly<{
      messages: ModelMessage[];
      identifier: string;
      schema: z.ZodType<T> | undefined;
      tools: Record<string, Tool> | undefined;
      maxSteps: number | undefined;
      stageName: string;
      settings: LlmSettings | undefined;
    }>,
  ): StreamResult<T> => {
    const { messages, identifier, schema, tools, maxSteps, settings } = reqParams;

    return buildStreamResult<T>({
      messages,
      identifier,
      schema,
      tools,
      maxSteps,
      stageName: reqParams.stageName,
      maskedUri,
      settings,
      eventSource: (signal?: AbortSignal) => {
        const orMessages = convertToOrMessages(messages);
        // deno-lint-ignore no-explicit-any
        const orInput = fromChatMessages(orMessages as any);
        const orReqTools = tools ? convertToOrRequestTools(tools) : undefined;

        const request: OpenResponsesRequest & { stream: true } = {
          model: modelName,
          input: orInput,
          stream: true as const,
          ...(orReqTools && orReqTools.length > 0 ? { tools: orReqTools } : {}),
          ...(schema
            ? {
                text: {
                  format: {
                    type: "json_schema" as const,
                    name: "response",
                    schema: toJSONSchema(schema) as Record<string, unknown>,
                    strict: true,
                  },
                },
              }
            : {}),
          ...(settings?.temperature !== undefined ? { temperature: settings.temperature } : {}),
          ...(settings?.maxOutputTokens !== undefined ? { maxOutputTokens: settings.maxOutputTokens } : {}),
          ...(settings?.topP !== undefined ? { topP: settings.topP } : {}),
          ...(settings?.frequencyPenalty !== undefined ? { frequencyPenalty: settings.frequencyPenalty } : {}),
          ...(settings?.presencePenalty !== undefined ? { presencePenalty: settings.presencePenalty } : {}),
        };

        if (!engine.streamSend) {
          return Promise.reject(new Error("[OpenRouter] streamSend is not implemented in this engine. Use a real engine or provide a mock with streamSend."));
        }
        return engine.streamSend(request, signal);
      },
      logger,
      ctx,
      costTracker,
    });
  };

  (requester as unknown as { stream: LlmStreamer }).stream = streamer;

  return requester as LlmRequester;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveYamlLog({
  ctx,
  stageName,
  logId,
  yamlLogData,
  logger,
}: {
  ctx: RunContext;
  stageName: string;
  logId: string;
  yamlLogData: YamlLogData;
  logger: Logger;
}): Promise<void> {
  try {
    if (ctx.saveDebugFile) {
      const stageDir = getSubDebugDir({ ctx, stageDir: stageName });
      const yamlContent = yamlDump(sanitizeForYaml(yamlLogData), {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      await ctx.saveDebugFile({
        filename: `${logId}.yaml`,
        content: yamlContent,
        stageDir,
      });
    }
  } catch (err) {
    logger.warn(`[OpenRouter] Failed to save debug log: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Re-export ModelURI for convenience
export { ModelURI };
