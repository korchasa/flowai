/**
 * LLM session compaction module.
 * Manages conversation history size via trimming or summarization while maintaining tool consistency.
 *
 * @module
 */

import type { ModelMessage } from "ai";
import type { SummaryGenerator } from "./summary-generator.ts";
import { log } from "../logger/logger.ts";

/**
 * Interface for history compaction functionality.
 */
export interface HistoryCompactor {
  /**
   * Compacts the history by trimming messages from the beginning (oldest first)
   * to fit within the symbol budget while maintaining tool-call/tool-result consistency.
   * May use LLM for summarization if configured.
   */
  compact(messages: readonly ModelMessage[]): Promise<readonly ModelMessage[]> | readonly ModelMessage[];

  /**
   * Estimate message "weight" by length of JSON representation of content.
   */
  estimateSymbols(message: ModelMessage): number;
}

/**
 * Type guard for tool-call content parts.
 */
function isToolCallPart(part: unknown): part is { readonly type: "tool-call"; readonly toolCallId: string } {
  return typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "tool-call" &&
    "toolCallId" in part &&
    typeof (part as Record<string, unknown>).toolCallId === "string";
}

/**
 * Type guard for tool-result content parts.
 */
function isToolResultPart(
  part: unknown,
): part is { readonly type: "tool-result"; readonly toolCallId: string } {
  return typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "tool-result" &&
    "toolCallId" in part &&
    typeof (part as Record<string, unknown>).toolCallId === "string";
}

/**
 * Estimates message "weight" by length of JSON representation of content.
 */
function estimateSymbols(message: ModelMessage): number {
  const c: unknown = (message as unknown as { readonly content: unknown }).content;
  if (typeof c === "string") return c.length;
  try {
    return JSON.stringify(c ?? "").length;
  } catch {
    return 0;
  }
}

/**
 * Ensures tool-call/tool-result consistency in the message list.
 * Removes tool-results without corresponding tool-calls and tool-calls without corresponding tool-results.
 */
function ensureToolConsistency(messages: readonly ModelMessage[]): readonly ModelMessage[] {
  const toolCalls = new Set<string>();
  const toolResults = new Set<string>();

  // Collect all tool-call and tool-result IDs
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (isToolCallPart(part)) {
          toolCalls.add(part.toolCallId);
        }
      }
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (isToolResultPart(part)) {
          toolResults.add(part.toolCallId);
        }
      }
    }
  }

  // Filter messages to keep only consistent tool-call/tool-result pairs
  return messages.filter((msg) => {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      // Check if all assistant message tool-calls have corresponding results
      const allToolCallsConsistent = msg.content.every((part) =>
        !isToolCallPart(part) || toolResults.has(part.toolCallId)
      );
      return allToolCallsConsistent;
    } else if (msg.role === "tool" && Array.isArray(msg.content)) {
      // Check if all tool message results have corresponding calls
      const allToolResultsConsistent = msg.content.every((part) =>
        !isToolResultPart(part) || toolCalls.has(part.toolCallId)
      );
      return allToolResultsConsistent;
    }
    // Keep non-tool messages
    return true;
  });
}

/**
 * Simple history compactor - handles message trimming within symbol limits
 * while maintaining tool-call/tool-result consistency.
 */
export class SimpleHistoryCompactor implements HistoryCompactor {
  private readonly maxSymbols: number;

  constructor({ maxSymbols }: Readonly<{ maxSymbols: number }>) {
    this.maxSymbols = maxSymbols;
  }

  /**
   * Compacts the context by trimming messages from the beginning (oldest first)
   * to fit within the symbol budget while maintaining tool-call/tool-result consistency.
   */
  compact(messages: readonly ModelMessage[]): readonly ModelMessage[] {
    // First, trim by symbol limit
    const trimmedMessages = this.trimBySymbolLimit(messages);

    // Then ensure tool-call/tool-result consistency
    return ensureToolConsistency(trimmedMessages);
  }

  /** Estimate message "weight" by length of JSON representation of content. */
  estimateSymbols(message: ModelMessage): number {
    return estimateSymbols(message);
  }

  /**
   * Trims messages from the beginning to fit within the symbol budget.
   * Messages are taken from the end (most recent) and added to the result.
   */
  private trimBySymbolLimit(messages: readonly ModelMessage[]): readonly ModelMessage[] {
    const out: ModelMessage[] = [];
    let total = 0;

    // Start from the most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const len = this.estimateSymbols(msg);

      if (total + len > this.maxSymbols) {
        if (out.length > 0) break; // already have something — finish
        // first candidate message is too large by itself — skip and continue
        continue;
      }

      out.unshift(msg);
      total += len;
    }

    return out;
  }
}

/**
 * LLM-powered history compactor - uses summarization when token threshold is exceeded
 * Falls back to simple trimming if threshold not exceeded or if summarization fails.
 */
export class SummarizingHistoryCompactor implements HistoryCompactor {
  private readonly summaryTokenThreshold: number | undefined;
  private readonly summaryGenerator: SummaryGenerator;
  private readonly simpleCompactor: SimpleHistoryCompactor;

  constructor(
    { maxSymbols, summaryTokenThreshold, summaryGenerator }: Readonly<{
      maxSymbols: number;
      summaryTokenThreshold?: number;
      summaryGenerator: SummaryGenerator;
    }>
  ) {
    this.summaryTokenThreshold = summaryTokenThreshold;
    this.summaryGenerator = summaryGenerator;
    this.simpleCompactor = new SimpleHistoryCompactor({ maxSymbols });
  }

  /**
   * Compacts history using LLM summarization if token threshold exceeded,
   * otherwise falls back to simple trimming.
   */
  async compact(messages: readonly ModelMessage[]): Promise<readonly ModelMessage[]> {
    // If no threshold configured, use simple compaction
    if (this.summaryTokenThreshold === undefined) {
      return this.simpleCompactor.compact(messages);
    }

    // Estimate current tokens (rough approximation)
    const currentTokens = this.estimateTokens(messages);

    log({
      mod: "summarizing_compactor",
      event: "compact_check",
      messageCount: messages.length,
      estimatedTokens: currentTokens,
      threshold: this.summaryTokenThreshold,
      needsSummarization: currentTokens > this.summaryTokenThreshold,
    });

    // If within threshold, no summarization needed
    if (currentTokens <= this.summaryTokenThreshold) {
      return this.simpleCompactor.compact(messages);
    }

    // Threshold exceeded - try summarization
    try {
      return await this.summarizeAndCompact(messages);
    } catch (error) {
      // Fall back to simple compaction on error
      log({
        mod: "summarizing_compactor",
        event: "summarization_failed",
        error: error instanceof Error ? error.message : String(error),
      });
      return this.simpleCompactor.compact(messages);
    }
  }

  /**
   * Estimates message "weight" by length of JSON representation of content.
   */
  estimateSymbols(message: ModelMessage): number {
    return estimateSymbols(message);
  }

  /**
   * Estimates total tokens in message set (rough approximation)
   */
  private estimateTokens(messages: readonly ModelMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      // Rough approximation: 1 token per 4 characters
      total += Math.ceil(this.estimateSymbols(msg) / 4);
    }
    return total;
  }

  /**
   * Summarizes old messages and keeps recent ones.
   */
  private async summarizeAndCompact(messages: readonly ModelMessage[]): Promise<readonly ModelMessage[]> {
    // Find split point - keep last user-assistant exchange
    let keepFromIndex = messages.length;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        // Keep this assistant message and previous user message
        keepFromIndex = Math.max(0, i - 1);
        break;
      }
    }

    const toSummarize = messages.slice(0, keepFromIndex);
    const toKeep = messages.slice(keepFromIndex);

    // If nothing to summarize, use simple compaction
    if (toSummarize.length === 0) {
      return this.simpleCompactor.compact(messages);
    }

    log({
      mod: "summarizing_compactor",
      event: "summarize_messages",
      toSummarizeCount: toSummarize.length,
      toKeepCount: toKeep.length,
    });

    // Generate summary of old messages
    const summaryMessage = await this.summaryGenerator.generateSummary({ messages: toSummarize });

    // Add dummy user message if summary is first message
    // (to maintain proper message alternation)
    const messagesToUse: readonly ModelMessage[] = toKeep.length > 0 && toKeep[0].role === "user"
      ? [summaryMessage, ...toKeep]
      : [
        { role: "user", content: "[Previous conversation summary]" },
        summaryMessage,
        ...toKeep,
      ];

    // Apply consistency check to final messages
    return ensureToolConsistency(messagesToUse);
  }
}
