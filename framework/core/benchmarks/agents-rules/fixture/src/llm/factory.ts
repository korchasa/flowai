/**
 * Unified LLM factory that routes by provider.
 *
 * Routes `openrouter` provider URIs to the native `@openrouter/sdk` path,
 * and all other providers to the Vercel AI SDK path.
 *
 * Usage:
 * ```ts
 * import { createLlmRequester } from "./factory.ts";
 * import { ModelURI } from "./llm.ts";
 *
 * const llm = createLlmRequester({ modelUri: ModelURI.parse("openrouter/openai/gpt-4o"), ... });
 * const llm2 = createLlmRequester({ modelUri: ModelURI.parse("openai/gpt-4"), ... });
 * ```
 */

import {
  createVercelRequester,
  type LlmRequester,
  type LlmRequesterParams,
} from "./llm.ts";
import { createOpenRouterRequester } from "../openrouter/openrouter.ts";

/**
 * Creates an `LlmRequester` for the given model URI, routing by provider:
 * - `openrouter` → native `@openrouter/sdk`
 * - all others → Vercel AI SDK
 */
export function createLlmRequester(params: LlmRequesterParams): LlmRequester {
  if (params.modelUri.provider === "openrouter") {
    return createOpenRouterRequester(params);
  }
  return createVercelRequester(params);
}
