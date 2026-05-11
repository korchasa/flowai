/**
 * LLM interaction module using Vercel AI SDK.
 * Provides URI-based model configuration, retries, and structured logging.
 *
 * @module
 */

import type { z } from "zod";
import { dump as yamlDump } from "js-yaml";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { Logger } from "../logger/logger.ts";
import type { CostTracker } from "../cost-tracker/cost-tracker.ts";
import type { RunContext } from "../run-context/run-context.ts";
import { getSubDebugDir } from "../run-context/run-context.ts";
import {
  generateText,
  streamText,
  Output,
  stepCountIs,
  zodSchema,
  type ModelMessage,
  type Tool,
  TypeValidationError,
  JSONParseError,
  APICallError,
  type LanguageModel,
  type CallSettings,
  NoObjectGeneratedError
} from "ai";

/**
 * Interface for the underlying generation engine to allow mocking in tests.
 */
export interface LlmEngine {
  // deno-lint-ignore no-explicit-any
  generateText<T>(params: Record<string, any>): Promise<any>;
  // deno-lint-ignore no-explicit-any
  streamText(params: Record<string, any>): any;
}

/**
 * Default implementation using Vercel AI SDK.
 */
export const defaultLlmEngine: LlmEngine = {
  // deno-lint-ignore no-explicit-any
  generateText: (params: any) => generateText(params),
  // deno-lint-ignore no-explicit-any
  streamText: (params: any) => streamText(params),
};

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Result of a generation request to an LLM.
 */
export interface GenerateResult<T> {
  readonly result: T | null; // For structured output
  readonly text?: string;    // For conversational output
  readonly toolCalls?: Array<{ toolCallId: string; toolName: string; args: unknown }>;
  readonly toolResults?: Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>;
  /** All messages generated during this request (including tool calls and results) */
  readonly newMessages: ModelMessage[];
  /** Detailed steps from the underlying LLM provider */
  readonly steps: unknown[];
  readonly estimatedCost: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** Text of error for retry */
  readonly validationError?: string;
  /** Raw response text for retry */
  readonly rawResponse?: string;
}

/**
 * Streaming result of a generation request to an LLM.
 * Mirrors GenerateResult but provides async iterables and promise-based final values.
 */
export interface StreamResult<T> {
  /**
   * Async iterable of text chunks as they arrive.
   *
   * **Text-only mode**: chunks are yielded in real time from the LLM provider.
   *
   * **Structured mode** (with schema): the entire validated text is replayed as a
   * single chunk after internal buffering and retry. Consumer sees one yield.
   */
  readonly textStream: AsyncIterable<string>;
  /**
   * Async iterable of all stream parts (text-delta, tool-call, tool-result, finish, etc.).
   *
   * **Text-only mode**: parts come directly from the Vercel AI SDK `streamText` result.
   *
   * **Structured mode**: synthetic events are replayed after validation. Only `text-delta`
   * and `finish` events are emitted; intermediate events (tool-call, step-finish, etc.)
   * from failed attempts are not included.
   */
  // deno-lint-ignore no-explicit-any
  readonly fullStream: AsyncIterable<any>;
  /** Promise that resolves to the full generated text. */
  readonly text: Promise<string>;
  /** Promise that resolves to the structured output (null for text-only requests). */
  readonly output: Promise<T | null>;
  /** Promise that resolves to tool calls made during generation. */
  readonly toolCalls: Promise<Array<{ toolCallId: string; toolName: string; args: unknown }>>;
  /** Promise that resolves to tool results from executed tools. */
  readonly toolResults: Promise<Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>>;
  /**
   * Promise that resolves to all new messages generated during this request.
   * Does not resolve until the stream finishes — consumer must fully consume the
   * stream (or await another final promise like `text`) before relying on this value.
   */
  readonly newMessages: Promise<ModelMessage[]>;
  /** Promise that resolves to detailed steps from the underlying LLM provider. */
  readonly steps: Promise<unknown[]>;
  /** Promise that resolves to token usage statistics. */
  readonly usage: Promise<{ inputTokens: number; outputTokens: number }>;
  /**
   * Promise that resolves to the estimated cost of this request.
   * Cost is extracted from provider metadata when available (e.g. OpenRouter).
   * For providers that do not expose cost metadata, this resolves to `0`.
   */
  readonly estimatedCost: Promise<number>;
}

/**
 * Type for LLM streamer function.
 * Returned by LlmRequester.stream.
 */
export type LlmStreamer = <T>(
  params: Readonly<{
    messages: ModelMessage[];
    identifier: string;
    schema: z.ZodType<T> | undefined;
    tools: Record<string, Tool> | undefined;
    maxSteps: number | undefined;
    stageName: string;
    settings: LlmSettings | undefined;
  }>
) => StreamResult<T>;

/**
 * Supported LLM generation settings.
 */
export type LlmSettings = CallSettings & {
  timeout?: number;
  toolChoice?: 'auto' | 'none' | 'required' | {
    type: 'tool';
    toolName: string;
  };
};

/**
 * Type for LLM requester function.
 *
 * You can use zod's .refine() or .superRefine() for complex validation with self-correction.
 * Errors from these methods will be sent back to the LLM for correction.
 */
export type LlmRequester = (<T>(
  params: Readonly<{
    messages: ModelMessage[];
    identifier: string;
    schema: z.ZodType<T> | undefined;
    tools: Record<string, Tool> | undefined;
    maxSteps: number | undefined;
    stageName: string;
    settings: LlmSettings | undefined;
  }>
) => Promise<GenerateResult<T>>) & { engine?: LlmEngine; stream: LlmStreamer };

/**
 * Represents a parsed Model URI.
 * Syntax: provider/model?params
 *
 * A protocol prefix (e.g. `chat://`, `response-api://`) is accepted for
 * backward compatibility but is ignored — it carries no behavioral meaning.
 *
 * - provider: openai | anthropic | gemini | openrouter | ollama
 * - model: model identifier (can contain slashes)
 * - params: URL parameters
 */
export class ModelURI {
  private constructor(private readonly url: URL) {}

  /**
   * Parses a model URI into provider and model components.
   *
   * Accepts both the short form (`provider/model`) and legacy forms with a
   * protocol prefix (`chat://provider/model`, `response-api://provider/model`).
   * The protocol, when present, is ignored.
   *
   * @param uri - The model URI to parse.
   * @returns A ModelURI instance.
   * @throws Error if the URI is invalid.
   *
   * @example
   * ```ts
   * const uri = ModelURI.parse("openai/gpt-4o?temperature=0.7");
   * // Legacy form also accepted:
   * const uri2 = ModelURI.parse("chat://openai/gpt-4o?temperature=0.7");
   * ```
   */
  static parse(uri: string): ModelURI {
    try {
      let normalizedUri = uri;

      if (!uri.includes("://")) {
        // If no protocol is provided, default to chat://
        // e.g. "openai/gpt-4" -> "chat://openai/gpt-4"
        normalizedUri = `chat://${uri}`;
      }

      const url = new URL(normalizedUri);
      
      // Validate that we have a host (provider) and a pathname (model)
      if (!url.host) {
        throw new Error("Provider (host) is required in model URI");
      }
      if (!url.pathname || url.pathname === "/") {
        throw new Error("Model identifier (path) is required in model URI");
      }

      return new ModelURI(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse model URI "${uri}": ${message}`);
    }
  }

  get protocol(): string {
    return this.url.protocol.replace(":", "");
  }

  get provider(): string {
    return this.url.host;
  }

  get modelName(): string {
    // Model identifier is the pathname without the leading slash.
    // e.g. chat://openai/gpt-4 -> /gpt-4 -> gpt-4
    // e.g. chat://openrouter/meta-llama/llama-3 -> /meta-llama/llama-3 -> meta-llama/llama-3
    let name = this.url.pathname;
    if (name.startsWith("/")) name = name.slice(1);
    if (name.endsWith("/")) name = name.slice(0, -1);
    return name;
  }

  get params(): URLSearchParams {
    return this.url.searchParams;
  }

  toString(): string {
    const maskedUrl = new URL(this.url.toString());
    if (maskedUrl.searchParams.has("apiKey")) {
      maskedUrl.searchParams.set("apiKey", "***");
    }
    // Return protocol-free format: provider/model?params
    const providerAndPath = maskedUrl.host + decodeURIComponent(maskedUrl.pathname);
    const query = maskedUrl.search;
    return providerAndPath + query;
  }
}

/**
 * Parameters for creating an LLM requester.
 */
export interface LlmRequesterParams {
  readonly modelUri: ModelURI;
  readonly logger: Logger;
  readonly costTracker: CostTracker;
  readonly ctx: RunContext;
}

/**
 * Parsed model URI components.
 */
interface ParsedModelUri {
  readonly provider: string;
  readonly modelName: string;
  readonly apiKey?: string;
  readonly baseURL?: string;
  readonly logVercelWarnings?: boolean;
  /** Maximum number of validation retry attempts. Defaults to DEFAULT_MAX_VALIDATION_RETRIES. */
  readonly maxValidationRetries: number;
  readonly params: Readonly<Record<string, string>>;
  readonly settings: LlmSettings;
}

/**
 * YAML request data for logging.
 */
interface YamlRequestData {
  readonly model: string;
  readonly messages: ReadonlyArray<{ readonly role: string; readonly content: string }>;
  readonly response_format?: { readonly type: string };
}

/**
 * YAML response data for logging.
 */
interface YamlResponseData {
  readonly status: number;
  readonly raw: string;
  readonly parsed: unknown;
  readonly error?: string;
  readonly steps?: unknown[];
}

/**
 * YAML statistics for logging.
 */
interface YamlStatsData {
  readonly duration: number;
  readonly cost: number;
  readonly tokens: {
    readonly input: number;
    readonly output: number;
    readonly total: number;
  };
}

/**
 * Full YAML log structure.
 */
interface YamlLogData {
  readonly id: string;
  readonly timestamp: string;
  readonly model: string;
  readonly stage: string;
  readonly settings: LlmSettings;
  readonly request: YamlRequestData;
  readonly attempts: YamlLogAttempt[];
}

/**
 * Single attempt in the YAML log.
 */
interface YamlLogAttempt {
  readonly attempt: number;
  readonly timestamp: string;
  readonly response?: YamlResponseData;
  readonly stats?: YamlStatsData;
  readonly error?: string;
}

const DEFAULT_MAX_VALIDATION_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Aggregates new ModelMessages from LLM steps (shared by both generate and stream paths).
 */
// deno-lint-ignore no-explicit-any
function buildNewMessagesFromSteps(steps: any[]): ModelMessage[] {
  const newMessages: ModelMessage[] = [];
  for (const step of steps) {
    if (step.text || (step.toolCalls && step.toolCalls.length > 0)) {
      newMessages.push({
        role: "assistant",
        content: step.toolCalls && step.toolCalls.length > 0
          ? (step.text
            ? [{ type: 'text', text: step.text }, ...step.toolCalls.map((tc: unknown) => ({ type: 'tool-call', ...(tc as Record<string, unknown>) }))]
            : step.toolCalls.map((tc: unknown) => ({ type: 'tool-call', ...(tc as Record<string, unknown>) })))
          : step.text
      } as ModelMessage);
    }
    if (step.toolResults && step.toolResults.length > 0) {
      for (const tr of step.toolResults) {
        const toolResult = tr as Record<string, unknown>;
        newMessages.push({
          role: "tool",
          content: [{
            type: 'tool-result',
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.toolName,
            result: toolResult.result ?? null,
          }]
        } as unknown as ModelMessage);
      }
    }
  }
  return newMessages;
}

/**
 * Parses a model URI into provider and model components.
 */
function parseModelUri({ uri }: Readonly<{ uri: ModelURI }>): ParsedModelUri {
  const result: ParsedModelUri = {
    provider: uri.provider,
    modelName: uri.modelName,
    maxValidationRetries: DEFAULT_MAX_VALIDATION_RETRIES,
    params: {},
    settings: {},
  };

  const mutableParams: Record<string, string> = {};
  const mutableSettings: Record<string, unknown> = {};

  for (const [key, value] of uri.params.entries()) {
    if (key === "apiKey") (result as { apiKey?: string }).apiKey = value;
    else if (key === "baseURL") (result as { baseURL?: string }).baseURL = value;
    else if (key === "logVercelWarnings") {
      (result as { logVercelWarnings?: boolean }).logVercelWarnings = value !== "false";
    }
    else if (key === "maxValidationRetries") {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 1) {
        (result as { maxValidationRetries: number }).maxValidationRetries = numValue;
      }
    }
    else if (["maxTokens", "temperature", "topP", "topK", "frequencyPenalty", "presencePenalty", "seed", "maxRetries", "timeout"].includes(key)) {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        mutableSettings[key] = numValue;
      }
    }
    else if (key === "stop") {
      // Handle comma-separated stop sequences if multiple
      mutableSettings[key] = value.includes(",") ? value.split(",") : value;
    }
    else mutableParams[key] = value;
  }

  (result as { settings: LlmSettings }).settings = mutableSettings as LlmSettings;

  if (!result.apiKey) {
    const provider = result.provider;
    const envKey = `${provider.toUpperCase()}_API_KEY`;
    const envValue = Deno.env.get(envKey);
    if (envValue) {
      (result as { apiKey?: string }).apiKey = envValue;
    }
  }

  (result as { params: Record<string, string> }).params = mutableParams;

  return result;
}

/**
 * Creates a language model instance from parsed URI.
 */
function createModelInstance({ parsed }: Readonly<{ parsed: ParsedModelUri }>): LanguageModel {
  const { provider, modelName, apiKey, baseURL } = parsed;

  switch (provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey, baseURL });
      return openai.chat(modelName);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelName);
    }
    case "gemini": {
      const gemini = createGoogleGenerativeAI({ apiKey });
      return gemini(modelName);
    }
    case "openrouter":
      throw new Error(
        `OpenRouter is not supported via createVercelRequester(). ` +
        `Use createLlmRequester() from "@korchasa/ai-skel-ts" (unified factory) ` +
        `or createOpenRouterRequester() from "@korchasa/ai-skel-ts/openrouter" instead.`,
      );
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Recursively sanitizes data for YAML logging, converting non-serializable objects.
 */
function sanitizeForYaml(obj: unknown, visited = new WeakSet()): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (visited.has(obj)) {
    return "[Circular Reference]";
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...(obj as unknown as Record<string, unknown>),
    };
  }

  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForYaml(item, visited));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeForYaml(value, visited);
  }
  return sanitized;
}

/**
 * Formats data for YAML logging.
 */
function createYamlLog(
  { logData }: Readonly<{ logData: YamlLogData }>
): string {
  return yamlDump(sanitizeForYaml(logData), {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

/**
 * Ensures a directory exists.
 */
async function ensureDebugDir({ debugDir }: Readonly<{ debugDir: string }>): Promise<void> {
  try {
    await stat(debugDir);
  } catch {
    await mkdir(debugDir, { recursive: true });
  }
}

/**
 * Calculates retry delay with exponential backoff and jitter.
 */
function calculateRetryDelay({ attempt }: Readonly<{ attempt: number }>): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return delay + (delay * Math.random() * 0.2);
}

/**
 * Internal result shape for the structured-output buffered retry loop.
 * Defined at module level for consistency with other internal interfaces.
 */
interface StructuredWorkResult<T> {
  textBuffer: string[];
  output: T;
  usage: { inputTokens: number; outputTokens: number };
  cost: number;
  // deno-lint-ignore no-explicit-any
  steps: any[];
  // deno-lint-ignore no-explicit-any
  toolCalls: any[];
  // deno-lint-ignore no-explicit-any
  toolResults: any[];
}

/**
 * Writes a YAML debug file for a streaming request via RunContext.saveDebugFile.
 * Silently skips if saveDebugFile is not available on the context.
 */
async function saveStreamYamlLog(
  { ctx, stageName, yamlLogData, logger }: Readonly<{
    ctx: RunContext;
    stageName: string;
    yamlLogData: YamlLogData;
    logger: Logger;
  }>
): Promise<void> {
  try {
    if (ctx.saveDebugFile) {
      const stageDir = getSubDebugDir({ ctx, stageDir: stageName.trim() || "unknown-stage" });
      const yamlContent = createYamlLog({ logData: yamlLogData });
      const logTimestamp = yamlLogData.timestamp.replace(/[:.]/g, "-");
      await ctx.saveDebugFile({
        filename: `${logTimestamp}-${yamlLogData.id}-stream-request-response.yaml`,
        content: yamlContent,
        stageDir,
      });
    }
  } catch (err) {
    logger.warn(`[LLM] Failed to save streaming debug log: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Internal helper for streaming text generation.
 *
 * Two modes:
 * - Text-only (no schema): real-time streaming, chunks yielded immediately.
 * - Structured (with schema): buffered retry loop — consumer sees only the successful attempt.
 */
function tryStreamText<T>(
  { identifier, schema, tools, maxSteps, messages, ctx, modelInstance, maskedUri, costTracker, logger, settings, engine, _stageName, maxValidationRetries }: Readonly<{
    identifier: string;
    schema: z.ZodType<T> | undefined;
    tools: Record<string, Tool> | undefined;
    maxSteps: number | undefined;
    messages: ModelMessage[];
    ctx: RunContext;
    modelInstance: LanguageModel;
    maskedUri: string;
    costTracker: CostTracker;
    logger: Logger;
    settings: LlmSettings | undefined;
    engine: LlmEngine;
    maxValidationRetries: number;
    /** Stage name for future debug file logging (not yet used in streaming path). */
    _stageName: string;
  }>
): StreamResult<T> {
  const startTime = Date.now();
  const timeoutMs = settings?.timeout ?? 30000;
  const logTimestamp = new Date().toISOString();

  // Build initial YAML log data for streaming debug file
  const streamLogData: YamlLogData = {
    id: identifier,
    timestamp: logTimestamp,
    model: maskedUri,
    stage: _stageName,
    settings: settings ?? ({} as LlmSettings),
    request: {
      model: maskedUri,
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
      ...(schema ? { response_format: { type: "json_object" } } : {}),
    },
    attempts: [],
  };

  if (!schema) {
    // ── Text-only: direct streaming, no buffering ──────────────────────────────
    logger.debug(
      `[LLM] [run:${ctx.runId}] [id:${identifier}] 🚀 Stream request: model=${maskedUri}, timeout=${timeoutMs}ms`
    );

    const controller = new AbortController();
    // Guard flag: prevents abort() after the stream completes. See issue #6.
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      try {
        controller.abort();
      } catch (error) {
        logger.warn(`[LLM] Error during stream abort(): ${error instanceof Error ? error.message : String(error)}`);
      }
    }, timeoutMs);

    const rawResult = engine.streamText({
      model: modelInstance,
      output: Output.text(),
      messages,
      tools,
      toolChoice: settings?.toolChoice,
      stopWhen: maxSteps ? stepCountIs(maxSteps) : undefined,
      abortSignal: controller.signal,
      ...settings,
    } as Record<string, unknown>);

    // Side effect: update token tracker when stream completes. Also clears timeout guard.
    // We also capture text for the debug log.
    const textForLog = rawResult.text as Promise<string>;
    const usagePromise = (rawResult.usage as Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }>).then(async (usage) => {
      settled = true;
      clearTimeout(timeoutId);
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const duration = Date.now() - startTime;
      costTracker.addTokens(inputTokens, outputTokens);
      logger.info(
        `[LLM] [run:${ctx.runId}] [id:${identifier}] ✅ Stream complete: duration=${duration}ms, tokens=${inputTokens + outputTokens}`
      );

      // Write YAML debug file on success
      const resolvedText = await textForLog.catch(() => "");
      const logAttempt: YamlLogAttempt = {
        attempt: 1,
        timestamp: new Date().toISOString(),
        response: { status: 200, raw: resolvedText, parsed: null },
        stats: {
          duration,
          cost: 0,
          tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        },
      };
      (streamLogData.attempts as YamlLogAttempt[]).push(logAttempt);
      await saveStreamYamlLog({ ctx, stageName: _stageName, yamlLogData: streamLogData, logger });

      return { inputTokens, outputTokens };
    }).catch(async (err) => {
      settled = true;
      clearTimeout(timeoutId);

      // Write YAML debug file on error
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const logAttempt: YamlLogAttempt = {
        attempt: 1,
        timestamp: new Date().toISOString(),
        error: errorMsg,
        stats: {
          duration,
          cost: 0,
          tokens: { input: 0, output: 0, total: 0 },
        },
      };
      (streamLogData.attempts as YamlLogAttempt[]).push(logAttempt);
      await saveStreamYamlLog({ ctx, stageName: _stageName, yamlLogData: streamLogData, logger });

      throw err;
    });

    // Extract cost from providerMetadata independently (e.g. OpenRouter exposes cost there).
    // Runs asynchronously from usage tracking to avoid adding microtask ticks to usage resolution.
    const estimatedCostPromise: Promise<number> = (
      // deno-lint-ignore no-explicit-any
      (rawResult as any).providerMetadata as Promise<Record<string, Record<string, unknown>> | undefined>
    ).then((pm) => {
      const openrouterUsage = pm?.openrouter?.usage as { cost?: number } | undefined;
      const cost = openrouterUsage?.cost ?? (pm?.openrouter?.cost as number) ?? 0;
      costTracker.addCost(cost);
      return cost;
    }).catch(() => {
      costTracker.addCost(0);
      return 0;
    });

    const stepsPromise: Promise<unknown[]> = rawResult.steps
      ? Promise.resolve(rawResult.steps)
      : Promise.resolve([]);

    const newMessagesPromise: Promise<ModelMessage[]> = stepsPromise.then(steps =>
      // deno-lint-ignore no-explicit-any
      buildNewMessagesFromSteps(steps as any[])
    );

    const toolCallsPromise: Promise<Array<{ toolCallId: string; toolName: string; args: unknown }>> = rawResult.toolCalls
      ? Promise.resolve(rawResult.toolCalls)
      : Promise.resolve([]);

    const toolResultsPromise: Promise<Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>> = rawResult.toolResults
      ? Promise.resolve(rawResult.toolResults)
      : Promise.resolve([]);

    return {
      textStream: rawResult.textStream as AsyncIterable<string>,
      // deno-lint-ignore no-explicit-any
      fullStream: rawResult.fullStream as AsyncIterable<any>,
      text: rawResult.text as Promise<string>,
      output: Promise.resolve(null),
      toolCalls: toolCallsPromise,
      toolResults: toolResultsPromise,
      newMessages: newMessagesPromise,
      steps: stepsPromise,
      usage: usagePromise,
      estimatedCost: estimatedCostPromise,
    };
  }

  // ── Structured output: buffered retry loop ────────────────────────────────────
  logger.debug(
    `[LLM] [run:${ctx.runId}] [id:${identifier}] 🚀 Stream (structured) request: model=${maskedUri}`
  );

  // Run the buffered retry loop as an async promise
  const workPromise: Promise<StructuredWorkResult<T>> = (async () => {
    const allMessages = [...messages];

    for (let attempt = 1; attempt <= maxValidationRetries; attempt++) {
      const attemptStart = Date.now();
      const controller = new AbortController();
      // Guard flag: prevents abort() after the stream settles. See issue #6.
      let attemptSettled = false;
      const attemptTimeoutId = setTimeout(() => {
        if (attemptSettled) return;
        try {
          controller.abort();
        } catch (error) {
          logger.warn(`[LLM] Error during structured stream abort(): ${error instanceof Error ? error.message : String(error)}`);
        }
      }, timeoutMs);

      const rawResult = engine.streamText({
        model: modelInstance,
        output: Output.object({ schema: zodSchema(schema) }),
        messages: allMessages,
        tools,
        toolChoice: settings?.toolChoice,
        stopWhen: maxSteps ? stepCountIs(maxSteps) : undefined,
        abortSignal: controller.signal,
        ...settings,
      } as Record<string, unknown>);

      // Consume stream internally to get text and structured output
      let text = "";
      let output: T | null = null;
      let validationErrorMsg = "The structured output is invalid or does not match the required schema. Please fix it.";

      try {
        text = await (rawResult.text as Promise<string>);
        attemptSettled = true;
        clearTimeout(attemptTimeoutId);
        try {
          output = await (rawResult.output as Promise<T | null>);
        } catch (validationError: unknown) {
          output = null;
          validationErrorMsg = validationError instanceof Error ? validationError.message : String(validationError);
        }
      } catch (error: unknown) {
        attemptSettled = true;
        clearTimeout(attemptTimeoutId);
        const msg = error instanceof Error ? error.message : String(error);

        // Attempt to track tokens from the failed stream — usage may or may not resolve
        try {
          const errUsage = await (rawResult.usage as Promise<{ inputTokens?: number; outputTokens?: number }>);
          const errInputTokens = errUsage.inputTokens ?? 0;
          const errOutputTokens = errUsage.outputTokens ?? 0;
          if (errInputTokens > 0 || errOutputTokens > 0) {
            costTracker.addCost(0);
            costTracker.addTokens(errInputTokens, errOutputTokens);
          }
        } catch {
          // Usage promise rejected — no token data available for this failed attempt
        }

        // Log failed attempt for YAML debug
        const attemptDuration = Date.now() - attemptStart;
        (streamLogData.attempts as YamlLogAttempt[]).push({
          attempt,
          timestamp: new Date().toISOString(),
          error: msg,
          stats: { duration: attemptDuration, cost: 0, tokens: { input: 0, output: 0, total: 0 } },
        });

        logger.debug(`[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] Stream error: ${msg}`);
        if (attempt >= maxValidationRetries) {
          // Write YAML debug file before throwing
          await saveStreamYamlLog({ ctx, stageName: _stageName, yamlLogData: streamLogData, logger });
          throw new Error(`Streaming structured output failed after ${maxValidationRetries} attempts: ${msg}`);
        }
        allMessages.push({ role: "assistant", content: text || "" });
        allMessages.push({ role: "user", content: msg });
        const delay = calculateRetryDelay({ attempt });
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (output !== null && output !== undefined) {
        // Validation passed — track cost and return
        const usageRaw = await (rawResult.usage as Promise<{ inputTokens?: number; outputTokens?: number }>);
        const inputTokens = usageRaw.inputTokens ?? 0;
        const outputTokens = usageRaw.outputTokens ?? 0;
        const duration = Date.now() - startTime;

        // Extract cost from provider metadata if available (e.g. OpenRouter)
        // deno-lint-ignore no-explicit-any
        const providerMetadata = await (((rawResult as any).providerMetadata as Promise<Record<string, Record<string, unknown>> | undefined> | undefined)?.catch(() => undefined) ?? Promise.resolve(undefined));
        const openrouterUsage = providerMetadata?.openrouter?.usage as { cost?: number } | undefined;
        const cost = openrouterUsage?.cost ?? (providerMetadata?.openrouter?.cost as number) ?? 0;

        costTracker.addCost(cost);
        costTracker.addTokens(inputTokens, outputTokens);
        logger.info(
          `[LLM] [run:${ctx.runId}] [id:${identifier}] ✅ Stream (structured) complete: attempt=${attempt}, duration=${duration}ms, cost=$${cost.toFixed(6)}, tokens=${inputTokens + outputTokens}`
        );

        // Log successful attempt for YAML debug
        const attemptDuration = Date.now() - attemptStart;
        (streamLogData.attempts as YamlLogAttempt[]).push({
          attempt,
          timestamp: new Date().toISOString(),
          response: { status: 200, raw: text, parsed: output },
          stats: {
            duration: attemptDuration,
            cost,
            tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
          },
        });
        await saveStreamYamlLog({ ctx, stageName: _stageName, yamlLogData: streamLogData, logger });

        // deno-lint-ignore no-explicit-any
        const steps: any[] = rawResult.steps ? await Promise.resolve(rawResult.steps) : [];
        // deno-lint-ignore no-explicit-any
        const toolCalls: any[] = rawResult.toolCalls ? await Promise.resolve(rawResult.toolCalls) : [];
        // deno-lint-ignore no-explicit-any
        const toolResults: any[] = rawResult.toolResults ? await Promise.resolve(rawResult.toolResults) : [];

        return {
          textBuffer: [text],
          output,
          usage: { inputTokens, outputTokens },
          cost,
          steps,
          toolCalls,
          toolResults,
        };
      }

      // Validation failed — track cost/tokens from this attempt before retrying
      let failedInputTokens = 0;
      let failedOutputTokens = 0;
      let failedCost = 0;
      try {
        const failedUsage = await (rawResult.usage as Promise<{ inputTokens?: number; outputTokens?: number }>);
        failedInputTokens = failedUsage.inputTokens ?? 0;
        failedOutputTokens = failedUsage.outputTokens ?? 0;

        // deno-lint-ignore no-explicit-any
        const failedProviderMetadata = await (((rawResult as any).providerMetadata as Promise<Record<string, Record<string, unknown>> | undefined> | undefined)?.catch(() => undefined) ?? Promise.resolve(undefined));
        const failedOrUsage = failedProviderMetadata?.openrouter?.usage as { cost?: number } | undefined;
        failedCost = failedOrUsage?.cost ?? (failedProviderMetadata?.openrouter?.cost as number) ?? 0;

        if (failedInputTokens > 0 || failedOutputTokens > 0 || failedCost > 0) {
          costTracker.addCost(failedCost);
          costTracker.addTokens(failedInputTokens, failedOutputTokens);
        }
        logger.debug(
          `[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] Structured output validation failed (tokens=${failedInputTokens + failedOutputTokens}), retrying... Error: ${validationErrorMsg}`
        );
      } catch {
        logger.debug(
          `[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] Structured output validation failed (usage unavailable), retrying... Error: ${validationErrorMsg}`
        );
      }

      // Log failed validation attempt for YAML debug
      const attemptDuration = Date.now() - attemptStart;
      (streamLogData.attempts as YamlLogAttempt[]).push({
        attempt,
        timestamp: new Date().toISOString(),
        response: { status: 200, raw: text, parsed: null, error: validationErrorMsg },
        stats: {
          duration: attemptDuration,
          cost: failedCost,
          tokens: { input: failedInputTokens, output: failedOutputTokens, total: failedInputTokens + failedOutputTokens },
        },
      });

      allMessages.push({ role: "assistant", content: text || "" });
      allMessages.push({ role: "user", content: validationErrorMsg });

      if (attempt < maxValidationRetries) {
        const delay = calculateRetryDelay({ attempt });
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // Write YAML debug file before throwing (all attempts exhausted)
    await saveStreamYamlLog({ ctx, stageName: _stageName, yamlLogData: streamLogData, logger });
    throw new Error(`Streaming structured output failed: validation did not pass after ${maxValidationRetries} attempts`);
  })();

  // Return StreamResult with lazy async iterables backed by workPromise
  async function* makeTextStream(): AsyncIterable<string> {
    const result = await workPromise;
    for (const chunk of result.textBuffer) yield chunk;
  }

  async function* makeFullStream(): AsyncIterable<unknown> {
    const result = await workPromise;
    for (const chunk of result.textBuffer) {
      yield { type: "text-delta", textDelta: chunk };
    }
    yield { type: "finish", finishReason: "stop", usage: result.usage };
  }

  return {
    textStream: makeTextStream(),
    fullStream: makeFullStream(),
    text: workPromise.then(r => r.textBuffer.join("")),
    output: workPromise.then(r => r.output),
    toolCalls: workPromise.then(r => r.toolCalls),
    toolResults: workPromise.then(r => r.toolResults),
    newMessages: workPromise.then(r => {
      const msgs = buildNewMessagesFromSteps(r.steps);
      // Fallback: if steps didn't produce messages but we have text, ensure the
      // response appears in conversation history (common for structured output).
      if (msgs.length === 0) {
        const text = r.textBuffer.join("");
        if (text) {
          msgs.push({ role: "assistant", content: text } as ModelMessage);
        }
      }
      return msgs;
    }),
    steps: workPromise.then(r => r.steps),
    usage: workPromise.then(r => r.usage),
    estimatedCost: workPromise.then(r => r.cost),
  };
}

/**
 * Internal helper for generating JSON with logging and error handling.
 *
 * Supports self-correction on Zod validation errors, including those from
 * .refine() and .superRefine().
 */
async function tryGenerateJson<T>(
  { identifier, schema, tools, maxSteps, attempt, messages, ctx, modelInstance, maskedUri, costTracker, logger, settings, engine, maxValidationRetries }: Readonly<{
    identifier: string;
    schema: z.ZodType<T> | undefined;
    tools: Record<string, Tool> | undefined;
    maxSteps: number | undefined;
    attempt: number;
    messages: ModelMessage[];
    ctx: RunContext;
    modelInstance: LanguageModel;
    maskedUri: string;
    costTracker: CostTracker;
    logger: Logger;
    settings: LlmSettings | undefined;
    engine: LlmEngine;
    maxValidationRetries: number;
  }>
): Promise<GenerateResult<T> & { logAttempt: YamlLogAttempt }> {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

    try {
      logger.debug(
        `[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] 🚀 Request: model=${maskedUri}, maxValidationRetries=${maxValidationRetries}, timeout=${settings?.timeout ?? 30000}ms, attempt=${attempt}`
      );

      try {
        const controller = new AbortController();
        const timeoutMs = settings?.timeout ?? 30000;
        // Guard flag: prevents abort() from firing after the generateText promise
        // has already settled. This closes the race condition where the setTimeout
        // callback is already queued in the macrotask queue when clearTimeout runs,
        // causing abort() to trigger AbortError in dangling SDK-internal listeners
        // (e.g., fetch) that are no longer awaited — resulting in an unhandled
        // promise rejection that crashes the process. See GitHub issue #6.
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          try {
            controller.abort();
          } catch (error) {
            logger.warn(`[LLM] Error during controller.abort(): ${error instanceof Error ? error.message : String(error)}`);
          }
        }, timeoutMs);

        // Use generateText with Output.object if schema is present
        let result;
        try {
          result = await engine.generateText<T>({
            model: modelInstance,
            output: schema ? Output.object({ schema: zodSchema(schema) }) : Output.text(),
            messages,
            tools,
            toolChoice: settings?.toolChoice,
            stopWhen: maxSteps ? stepCountIs(maxSteps) : undefined,
            abortSignal: controller.signal,
            ...settings,
          } as Record<string, unknown>);
        } finally {
          settled = true;
          clearTimeout(timeoutId);
        }

        const usage = result.usage;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;

        // Extract cost information, preferring provider-specific metadata if available
        const providerMetadata = result.providerMetadata as Record<string, Record<string, unknown>> | undefined;
        const openrouterUsage = providerMetadata?.openrouter?.usage as { cost?: number } | undefined;
        const cost = openrouterUsage?.cost ?? (providerMetadata?.openrouter?.cost as number) ?? 0;

        costTracker.addCost(cost);
        costTracker.addTokens(inputTokens, outputTokens);

        const duration = Date.now() - startTime;

        // Log successful response with raw text and parsed object
        const responseData: YamlResponseData = {
          status: 200,
          raw: result.text,
          parsed: result.output,
          ...(result.steps && result.steps.length > 0 ? { steps: result.steps } : {}),
        };

        const statsData: YamlStatsData = {
          duration,
          cost,
          tokens: {
            input: inputTokens,
            output: outputTokens,
            total: usage.totalTokens ?? (inputTokens + outputTokens),
          },
        };

        const tokens = usage.totalTokens ?? (inputTokens + outputTokens);
        logger.info(
          `[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] ✅ Response: status=200, duration=${duration}ms, cost=$${cost.toFixed(6)}, tokens=${tokens}, finishReason=${result.finishReason}, steps=${result.steps?.length || 1}`
        );

        // Aggregate all messages from steps
        const newMessages: ModelMessage[] = buildNewMessagesFromSteps(result.steps ?? []);

        return {
          result: (result.output as T) ?? null,
          text: result.text,
          toolCalls: result.toolCalls as unknown as Array<{ toolCallId: string; toolName: string; args: unknown }>,
          toolResults: result.toolResults as unknown as Array<{ toolCallId: string; toolName: string; args: unknown; result: unknown }>,
          newMessages,
          steps: result.steps ?? [],
          estimatedCost: cost,
          inputTokens,
          outputTokens,
          rawResponse: result.text,
          logAttempt: {
            attempt,
            timestamp,
            response: responseData,
            stats: statsData,
          }
        };
      } catch (error: unknown) {
        let validationError = "Unknown error";
        let rawResponse = "";
        let status = 500;
        let errorInputTokens = 0;
        let errorOutputTokens = 0;
        const errorCost = 0;

        // Handle specific AI SDK error types to extract as much information as possible
        if (NoObjectGeneratedError.isInstance(error)) {
          // NoObjectGeneratedError occurs when the model responds but the output
          // doesn't match the schema or isn't valid JSON. It contains the raw text.
          validationError = `The response does not match the required schema. Issues:\n${error.message}`;
          rawResponse = error.text ?? "";
          status = 200; // Model responded, but output was invalid
          // Extract token usage from the failed attempt — the provider still charged for these tokens
          if (error.usage) {
            errorInputTokens = error.usage.inputTokens ?? 0;
            errorOutputTokens = error.usage.outputTokens ?? 0;
          }
        } else if (TypeValidationError.isInstance(error)) {
          validationError = `The JSON response does not match the required schema. Issues:\n${error.message}`;
          rawResponse = JSON.stringify(error.value);
        } else if (JSONParseError.isInstance(error)) {
          validationError = `Failed to parse JSON: ${error.message}`;
          rawResponse = error.text;
        } else if (APICallError.isInstance(error)) {
          validationError = `API Error: ${error.message}`;
          status = error.statusCode || 500;
        } else if (error instanceof Error && ('statusCode' in error)) {
          validationError = `API Error: ${error.message}`;
          status = (error as { statusCode: number }).statusCode || 500;
        } else if (error instanceof Error && error.name === 'AbortError') {
          validationError = `Request timed out after ${settings?.timeout ?? 30000}ms`;
          status = 408;
        } else {
          validationError = error instanceof Error ? error.message : String(error);
        }

        // Track cost and tokens from the failed attempt so they are not lost
        if (errorInputTokens > 0 || errorOutputTokens > 0 || errorCost > 0) {
          costTracker.addCost(errorCost);
          costTracker.addTokens(errorInputTokens, errorOutputTokens);
        }

        // Log error response with whatever raw information we managed to capture
        const errorResponseData: YamlResponseData = {
          status,
          raw: rawResponse,
          parsed: null,
          error: validationError,
        };

        logger.debug(
          `[LLM] [run:${ctx.runId}] [id:${identifier}:${attempt}] ❌ Error: status=${status}, error=${validationError}, tokens=${errorInputTokens + errorOutputTokens}`
        );

        return {
          result: null,
          newMessages: [],
          steps: [],
          estimatedCost: errorCost,
          inputTokens: errorInputTokens,
          outputTokens: errorOutputTokens,
          validationError: (status === 401 || status === 403 || status === 400)
            ? `Fatal API Error (${status}): ${validationError}`
            : validationError,
          rawResponse,
          logAttempt: {
            attempt,
            timestamp,
            response: errorResponseData,
            error: validationError,
          }
        };
      }
  } catch (outerError: unknown) {
    const message = outerError instanceof Error ? outerError.message : String(outerError);
    return {
      result: null,
      newMessages: [],
      steps: [],
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      validationError: `Critical Error: ${message}`,
      logAttempt: {
        attempt,
        timestamp: new Date().toISOString(),
        error: `Critical Error: ${message}`
      }
    };
  }
}

/**
 * Creates an LLM requester function.
 *
 * @param params - Parameters for the requester.
 * @returns A function that can be used to make LLM requests.
 *
 * @example
 * ```ts
 * const requester = createVercelRequester({ modelUri, logger, costTracker, ctx });
 * const result = await requester({ messages, identifier: "test", stageName: "test" });
 * ```
 */
export function createVercelRequester(params: LlmRequesterParams): LlmRequester {
  const { modelUri, logger, costTracker, ctx } = params;
  const parsed = parseModelUri({ uri: modelUri });
  const { settings: defaultSettings, maxValidationRetries } = parsed;

  if (parsed.logVercelWarnings === false) {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).AI_SDK_LOG_WARNINGS = false;
  }

  const modelInstance = createModelInstance({ parsed });
  const maskedUri = modelUri.toString();

  // deno-lint-ignore no-explicit-any
  const requester: any = async <T>(
    { messages: inputMessages, prompt, identifier, schema, tools, maxSteps, stageName, settings }: Readonly<{
      messages?: ModelMessage[];
      prompt?: string;
      identifier: string;
      schema: z.ZodType<T> | undefined;
      tools: Record<string, Tool> | undefined;
      maxSteps: number | undefined;
      stageName: string;
      settings: LlmSettings | undefined;
    }>
  ): Promise<GenerateResult<T>> => {
    const messages: ModelMessage[] = inputMessages ?? (prompt ? [{ role: "user", content: prompt }] : []);

    const mergedSettings = { ...defaultSettings, ...settings };
    const stageDir = stageName.trim() || "unknown-stage";
    const debugDir = getSubDebugDir({ ctx, stageDir });
    const logTimestamp = new Date().toISOString();
    const logFile = `${debugDir}/${logTimestamp.replace(/[:.]/g, "-")}-${identifier}-request-response.yaml`;
    const logFilename = basename(logFile);

    const logData: YamlLogData = {
      id: identifier,
      timestamp: logTimestamp,
      model: maskedUri,
      stage: stageName,
      settings: mergedSettings,
      request: {
        model: maskedUri,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })),
        ...(schema ? { response_format: { type: "json_object" } } : {}),
      },
      attempts: [],
    };

    await ensureDebugDir({ debugDir });
    await writeFile(logFile, createYamlLog({ logData }), "utf-8");

    for (let attempt = 1; attempt <= maxValidationRetries; attempt++) {
      const result = await tryGenerateJson<T>({
        identifier,
        schema,
        tools,
        maxSteps,
        attempt,
        messages,
        ctx,
        modelInstance,
        maskedUri,
        costTracker,
        logger,
        settings: mergedSettings,
        engine: requester.engine || defaultLlmEngine,
        maxValidationRetries,
      });

      // Update log file with attempt data
      (logData.attempts as YamlLogAttempt[]).push(result.logAttempt);
      await writeFile(logFile, createYamlLog({ logData }), "utf-8");

      if (!result.validationError) {
        logger.info(`[LLM] [run:${ctx.runId}] [id:${identifier}] Completed in ${attempt} attempts. File: ${logFilename}`);
        return result;
      }

      if (result.validationError && result.validationError.includes("Fatal API Error")) {
        return result;
      }

      if (result.rawResponse) {
        messages.push({ role: "assistant", content: result.rawResponse });
      } else {
        messages.push({ role: "assistant", content: "Invalid response received." });
      }
      messages.push({ role: "user", content: result.validationError || "Invalid response received." });

      if (attempt === maxValidationRetries) return result;

      const delay = calculateRetryDelay({ attempt });
      logger.warn(`🔄 Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
    return { result: null, newMessages: [], steps: [], estimatedCost: 0, inputTokens: 0, outputTokens: 0 };
  };

  requester.engine = defaultLlmEngine;

  // Attach the streaming method
  requester.stream = <T>(
    { messages: inputMessages, identifier, schema, tools, maxSteps, stageName, settings }: Readonly<{
      messages: ModelMessage[];
      identifier: string;
      schema: z.ZodType<T> | undefined;
      tools: Record<string, Tool> | undefined;
      maxSteps: number | undefined;
      stageName: string;
      settings: LlmSettings | undefined;
    }>
  ): StreamResult<T> => {
    const mergedSettings = { ...defaultSettings, ...settings };

    return tryStreamText<T>({
      identifier,
      schema,
      tools,
      maxSteps,
      messages: inputMessages,
      ctx,
      modelInstance,
      maskedUri,
      costTracker,
      logger,
      settings: mergedSettings,
      engine: requester.engine || defaultLlmEngine,
      _stageName: stageName,
      maxValidationRetries,
    });
  };

  return requester as LlmRequester;
}
