/**
 * Summary Generator - Handles LLM-powered history compression.
 * Creates summaries of old conversation history to maintain context efficiency
 * without losing important information.
 */

import type { ModelMessage } from "ai";
import type { LlmRequester, LlmSettings } from "../llm/llm.ts";
import { log } from "../logger/logger.ts";

/**
 * Configuration for summary generation.
 */
export interface SummaryGeneratorConfig {
  /** Maximum tokens to use for summary generation */
  readonly summaryMaxTokens?: number;
  /** Temperature for summary generation (0-1, default 0.3) */
  readonly temperature?: number;
}

/** System prompt sent to the LLM for conversation summarization. */
const SUMMARIZATION_SYSTEM_PROMPT =
  `You are a conversation summarizer. Your task is to create a concise summary of the provided conversation history. ` +
  `Preserve key facts, decisions, and context. Omit redundant details. ` +
  `Output only the summary text, no preamble.`;

/**
 * Service for generating summaries of message history via LLM.
 * Encapsulates all LLM interaction for history compression.
 * Uses LlmRequester for automatic retry, YAML debug files, cost tracking, and logging.
 */
export class SummaryGenerator {
  private readonly llm: LlmRequester;
  private readonly config: SummaryGeneratorConfig;

  constructor(
    { llm, config = {} }: Readonly<{
      llm: LlmRequester;
      config?: SummaryGeneratorConfig;
    }>
  ) {
    this.llm = llm;
    this.config = config;
  }

  /**
   * Generates a summary of conversation history using LLM.
   * Falls back to a degraded summary if the LLM call fails or returns a validation error.
   *
   * @param params - Parameters for summary generation.
   * @returns Summarized conversation as an assistant message.
   */
  async generateSummary({ messages }: Readonly<{ messages: readonly ModelMessage[] }>): Promise<ModelMessage> {
    log({
      mod: "summary_generator",
      event: "summary_start",
      messageCount: messages.length,
    });

    try {
      // Serialize messages into a readable format for the summarizer
      const serialized = messages
        .map((msg: ModelMessage) => {
          const content = typeof msg.content === "string"
            ? msg.content
            : (() => {
                try {
                  return JSON.stringify(msg.content);
                } catch {
                  return "[Complex content]";
                }
              })();
          return `[${msg.role}]: ${content}`;
        })
        .join("\n");

      const settings: LlmSettings = {};
      if (this.config.summaryMaxTokens !== undefined) {
        settings.maxOutputTokens = this.config.summaryMaxTokens;
      }
      if (this.config.temperature !== undefined) {
        settings.temperature = this.config.temperature;
      }

      const result = await this.llm({
        messages: [
          { role: "system", content: SUMMARIZATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Summarize the following conversation (${messages.length} messages):\n\n${serialized}`,
          },
        ],
        identifier: "summary-generation",
        stageName: "session-compaction",
        schema: undefined,
        tools: undefined,
        maxSteps: undefined,
        settings,
      });

      // Fall back to degraded summary if LLM returned a validation error or empty text
      if (result.validationError || !result.text) {
        log({
          mod: "summary_generator",
          event: "summary_llm_error",
          error: result.validationError ?? "empty response",
        });
        return this.buildFallback(messages.length);
      }

      log({
        mod: "summary_generator",
        event: "summary_complete",
        summaryLength: result.text.length,
      });

      return { role: "assistant", content: result.text };
    } catch (error) {
      log({
        mod: "summary_generator",
        event: "summary_error",
        error: error instanceof Error ? error.message : String(error),
      });
      return this.buildFallback(messages.length);
    }
  }

  /**
   * Builds a degraded fallback summary when LLM is unavailable.
   *
   * @param messageCount - Number of messages that were to be summarized.
   * @returns A minimal assistant message indicating summarization failed.
   */
  private buildFallback(messageCount: number): ModelMessage {
    return {
      role: "assistant",
      content: `Summary of conversation (${messageCount} messages): Error occurred during summarization, but conversation context is preserved.`,
    };
  }
}
