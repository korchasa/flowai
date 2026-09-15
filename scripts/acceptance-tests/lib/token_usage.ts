// [REF:fr:accept.token-usage | FR-ACCEPT.TOKEN-USAGE]
/**
 * What a run spent, split by the type of token.
 *
 * The harness reads token counts from two places that report the same numbers
 * in different spellings: the codex app-server sends `TokenUsageBreakdown`
 * frames (the judge and the user emulator), and codex rollouts carry
 * `total_token_usage` objects (the agent under test and its subagents). Both
 * are converted here so everything downstream handles one shape.
 *
 * ## The nesting trap
 *
 * In BOTH sources `inputTokens` is the whole input and `cachedInputTokens` is
 * the part of it that came from cache; likewise `outputTokens` already contains
 * `reasoningOutputTokens`. Adding the reported fields therefore counts the
 * cached half twice — and cached input is 90–95% of an acceptance run, so the
 * error is not a rounding detail, it roughly doubles the headline figure. The
 * converters subtract the inner field; the components of a `TokenBreakdown` are
 * disjoint and `freshInput + cachedInput` is the source's `inputTokens`.
 *
 * `total` is copied from the source rather than summed from the parts. It is
 * what the provider counted; recomputing it would report our arithmetic.
 *
 * Subtraction is NOT clamped at zero. If codex ever reports more cached input
 * than input, the negative number belongs in the report where it is seen and
 * fixed — a clamp would hide a broken measurement behind a plausible one.
 */

/** Token counts of one session or turn, components disjoint. */
export interface TokenBreakdown {
  /** Input that was NOT served from cache. */
  freshInput: number;
  /** Input served from cache (cache reads). */
  cachedInput: number;
  /** Input written INTO the cache. Reported by rollouts only. */
  cacheWrite: number;
  /** Generated text, reasoning excluded. */
  output: number;
  /** Reasoning output. */
  reasoning: number;
  /** The provider's own total. */
  total: number;
}

/** All zeroes — the identity of {@link addTokens}. */
export const EMPTY_TOKENS: TokenBreakdown = {
  freshInput: 0,
  cachedInput: 0,
  cacheWrite: 0,
  output: 0,
  reasoning: 0,
  total: 0,
};

/** Component-wise sum of two breakdowns. */
export function addTokens(
  a: TokenBreakdown,
  b: TokenBreakdown,
): TokenBreakdown {
  return {
    freshInput: a.freshInput + b.freshInput,
    cachedInput: a.cachedInput + b.cachedInput,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    total: a.total + b.total,
  };
}

/** True when nothing was spent — used to keep empty arms out of the report. */
export function isEmptyTokens(t: TokenBreakdown): boolean {
  return t.total === 0 && t.freshInput === 0 && t.cachedInput === 0 &&
    t.output === 0;
}

/**
 * `TokenUsageBreakdown` of the codex app-server protocol (v2), as
 * `thread/tokenUsage/updated` carries it. It has no cache-write counterpart.
 */
export interface AppServerTokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

/** `total_token_usage` of a rollout's `token_count` event. */
export interface RolloutTokenUsage {
  input_tokens: number;
  cached_input_tokens: number;
  cache_write_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
  total_tokens: number;
}

/** A field an older codex build may omit reads as 0, never as NaN. */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Converts one app-server breakdown. */
export function tokensFromAppServer(
  u: Partial<AppServerTokenUsage>,
): TokenBreakdown {
  return {
    freshInput: num(u.inputTokens) - num(u.cachedInputTokens),
    cachedInput: num(u.cachedInputTokens),
    cacheWrite: 0,
    output: num(u.outputTokens) - num(u.reasoningOutputTokens),
    reasoning: num(u.reasoningOutputTokens),
    total: num(u.totalTokens),
  };
}

/** Converts one rollout `total_token_usage`. */
export function tokensFromRollout(
  u: Partial<RolloutTokenUsage>,
): TokenBreakdown {
  return {
    freshInput: num(u.input_tokens) - num(u.cached_input_tokens),
    cachedInput: num(u.cached_input_tokens),
    cacheWrite: num(u.cache_write_input_tokens),
    output: num(u.output_tokens) - num(u.reasoning_output_tokens),
    reasoning: num(u.reasoning_output_tokens),
    total: num(u.total_tokens),
  };
}

function group(n: number): string {
  return n.toLocaleString("en-US");
}

/** One-line rendering for the run log and the summary. */
export function formatTokens(t: TokenBreakdown): string {
  return `${group(t.total)} total (fresh in ${group(t.freshInput)}, ` +
    `cached in ${group(t.cachedInput)}, cache write ${group(t.cacheWrite)}, ` +
    `out ${group(t.output)}, reasoning ${group(t.reasoning)})`;
}

/** The per-arm split a run reports, and the sum over the arms. */
export interface RunTokenUsage {
  /** The agent under test and every subagent it spawned. */
  agent?: TokenBreakdown;
  /** The judge and the user emulator. */
  judge?: TokenBreakdown;
  total: TokenBreakdown;
}

/**
 * Fold the two arms of a run into the scalar the cache carries and the split
 * the report prints (FR-ACCEPT.TOKEN-USAGE).
 *
 * An arm passed as `null` was not measured, and it stays absent from the
 * result: a measured zero and an unmeasured arm are different claims, and only
 * one of them says the run was free. When neither arm was measured there is no
 * breakdown at all.
 */
export function summarizeRunUsage(
  agent: TokenBreakdown | null,
  judge: TokenBreakdown | null,
): { tokensUsed: number; tokensDetails?: RunTokenUsage } {
  if (!agent && !judge) return { tokensUsed: 0 };
  const total = addTokens(agent ?? EMPTY_TOKENS, judge ?? EMPTY_TOKENS);
  return {
    tokensUsed: total.total,
    tokensDetails: {
      ...(agent ? { agent } : {}),
      ...(judge ? { judge } : {}),
      total,
    },
  };
}
