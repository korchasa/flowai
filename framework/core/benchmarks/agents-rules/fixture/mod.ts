/**
 * AI Skeleton Tools - TypeScript library for content fetching and LLM interactions
 *
 * @example
 * ```ts
 * import { createLlmRequester, CostTracker, fetchFromURL, JinaScraper } from "@korchasa/ai-skel-ts";
 * import { Logger } from "@korchasa/ai-skel-ts/logger";
 * ```
 *
 * @module
 */

// LLM Module — factory re-exports the unified createLlmRequester (routes by provider)
export { createLlmRequester } from "./src/llm/factory.ts";
export {
  ModelURI,
  type LlmRequester,
  type LlmRequesterParams,
  type LlmSettings,
  type GenerateResult,
  type StreamResult,
  type LlmStreamer,
} from "./src/llm/llm.ts";

// OpenRouter Native SDK Module
export {
  createOpenRouterRequester,
  convertToOrMessages,
  convertToOrTools,
  type OpenRouterEngine,
  type OpenRouterRequesterParams,
} from "./src/openrouter/openrouter.ts";

// Agent Module
export {
  Agent,
  type AgentParams,
} from "./src/agent/agent.ts";

// Fetch Content Module
export {
  fetch,
  fetchFromURL,
  type FetchOptions,
  type FetchFromURLOptions,
} from "./src/fetchers/local-fetcher/fetch-content.ts";
export type { FetchContentResult } from "./src/fetchers/types.ts";

// Jina Scraper Module
export {
  JinaScraper,
  JinaScraperError,
  type JinaScraperConfig,
  type JinaScraperOptions,
  type JinaScraperScrapeOptions,
  type JinaScraperResponse,
} from "./src/fetchers/jina-fetcher/jina-scraper.ts";

// Brave Search Module
export {
  BraveSearchClient,
  BraveSearchError,
  type BraveSearchConfig,
  type BraveSearchOptions,
  type BraveSearchResponse,
  type BraveSearchResult,
  type BraveSearchWebResponse,
} from "./src/fetchers/brave-fetcher/brave-search.ts";

// Cost Tracker Module
export {
  CostTracker,
  type CostReport,
} from "./src/cost-tracker/cost-tracker.ts";

// Logger Module
export {
  Logger,
  createContextFromLevelString,
  log,
  type LogLevel,
} from "./src/logger/logger.ts";

// LLM Session Compactor Module
export {
  SimpleHistoryCompactor,
  SummarizingHistoryCompactor,
  type HistoryCompactor,
} from "./src/llm-session-compactor/compactor.ts";

// Run Context Module
export {
  type RunContext,
  createRunContext,
  getSubDebugDir,
} from "./src/run-context/run-context.ts";

// Re-export commonly used types from dependencies
export type { ModelMessage, Tool } from "ai";
export { z, ZodError, type ZodType, type ZodIssue } from "zod";
