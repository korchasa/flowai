import { assertEquals } from "@std/assert";
import {
  addTokens,
  EMPTY_TOKENS,
  formatTokens,
  summarizeRunUsage,
  tokensFromAppServer,
  tokensFromRollout,
} from "./token_usage.ts";

Deno.test("app-server input excludes the cached half", () => {
  // Real frame shape: `inputTokens` is the TOTAL input, `cachedInputTokens` the
  // part of it served from cache. Adding them would count the cache twice.
  const t = tokensFromAppServer({
    inputTokens: 110703,
    cachedInputTokens: 92160,
    outputTokens: 1180,
    reasoningOutputTokens: 320,
    totalTokens: 111883,
  });
  assertEquals(t.freshInput, 18543);
  assertEquals(t.cachedInput, 92160);
  assertEquals(t.freshInput + t.cachedInput, 110703);
});

Deno.test("app-server output excludes the reasoning half", () => {
  const t = tokensFromAppServer({
    inputTokens: 100,
    cachedInputTokens: 0,
    outputTokens: 1180,
    reasoningOutputTokens: 320,
    totalTokens: 1280,
  });
  assertEquals(t.output, 860);
  assertEquals(t.reasoning, 320);
  assertEquals(t.output + t.reasoning, 1180);
});

Deno.test("the app-server reports no cache write", () => {
  const t = tokensFromAppServer({
    inputTokens: 10,
    cachedInputTokens: 0,
    outputTokens: 5,
    reasoningOutputTokens: 0,
    totalTokens: 15,
  });
  assertEquals(t.cacheWrite, 0);
});

Deno.test("the total comes from the source, not from the parts", () => {
  // codex counts the total itself and it is not the sum of the components —
  // recomputing it would report our arithmetic instead of the provider's bill.
  const t = tokensFromAppServer({
    inputTokens: 110703,
    cachedInputTokens: 92160,
    outputTokens: 1180,
    reasoningOutputTokens: 320,
    totalTokens: 111883,
  });
  assertEquals(t.total, 111883);
});

Deno.test("rollout usage splits the same way and keeps cache writes", () => {
  const t = tokensFromRollout({
    input_tokens: 110703,
    cached_input_tokens: 92160,
    cache_write_input_tokens: 4096,
    output_tokens: 1180,
    reasoning_output_tokens: 320,
    total_tokens: 111883,
  });
  assertEquals(t, {
    freshInput: 18543,
    cachedInput: 92160,
    cacheWrite: 4096,
    output: 860,
    reasoning: 320,
    total: 111883,
  });
});

Deno.test("a missing rollout field reads as zero, not NaN", () => {
  // Older codex builds omit `cache_write_input_tokens`. A NaN here would poison
  // every sum it reaches and the report would show nothing at all.
  const t = tokensFromRollout(
    { input_tokens: 10, output_tokens: 4, total_tokens: 14 } as never,
  );
  assertEquals(t.cacheWrite, 0);
  assertEquals(t.cachedInput, 0);
  assertEquals(t.reasoning, 0);
  assertEquals(t.freshInput, 10);
  assertEquals(t.output, 4);
});

Deno.test("addTokens sums every component", () => {
  const a = tokensFromRollout({
    input_tokens: 100,
    cached_input_tokens: 40,
    cache_write_input_tokens: 5,
    output_tokens: 20,
    reasoning_output_tokens: 8,
    total_tokens: 120,
  });
  const b = tokensFromRollout({
    input_tokens: 10,
    cached_input_tokens: 1,
    cache_write_input_tokens: 2,
    output_tokens: 3,
    reasoning_output_tokens: 1,
    total_tokens: 13,
  });
  assertEquals(addTokens(a, b), {
    freshInput: 69,
    cachedInput: 41,
    cacheWrite: 7,
    output: 14,
    reasoning: 9,
    total: 133,
  });
});

Deno.test("EMPTY_TOKENS is the identity of addTokens", () => {
  const a = tokensFromRollout({
    input_tokens: 7,
    cached_input_tokens: 2,
    cache_write_input_tokens: 1,
    output_tokens: 3,
    reasoning_output_tokens: 1,
    total_tokens: 10,
  });
  assertEquals(addTokens(a, EMPTY_TOKENS), a);
  assertEquals(addTokens(EMPTY_TOKENS, a), a);
});

Deno.test("formatTokens names every component", () => {
  const line = formatTokens({
    freshInput: 199925,
    cachedInput: 1773568,
    cacheWrite: 0,
    output: 8363,
    reasoning: 6568,
    total: 1988424,
  });
  assertEquals(
    line,
    "1,988,424 total (fresh in 199,925, cached in 1,773,568, " +
      "cache write 0, out 8,363, reasoning 6,568)",
  );
});

Deno.test("summarizeRunUsage: the headline number is every arm added together", () => {
  const agent = {
    freshInput: 100,
    cachedInput: 900,
    cacheWrite: 50,
    output: 20,
    reasoning: 10,
    total: 1020,
  };
  const judge = {
    freshInput: 5,
    cachedInput: 1,
    cacheWrite: 0,
    output: 2,
    reasoning: 1,
    total: 8,
  };
  const { tokensUsed, tokensDetails } = summarizeRunUsage(agent, judge);
  assertEquals(tokensUsed, 1028);
  assertEquals(tokensDetails?.total.cachedInput, 901);
  assertEquals(tokensDetails?.agent, agent);
  assertEquals(tokensDetails?.judge, judge);
});

Deno.test("summarizeRunUsage: an arm that was never measured is absent, not zero", () => {
  const judge = {
    freshInput: 5,
    cachedInput: 1,
    cacheWrite: 0,
    output: 2,
    reasoning: 1,
    total: 8,
  };
  const { tokensUsed, tokensDetails } = summarizeRunUsage(null, judge);
  assertEquals(tokensUsed, 8);
  assertEquals(tokensDetails?.agent, undefined);
  assertEquals(tokensDetails?.judge, judge);
});

Deno.test("summarizeRunUsage: nothing measured at all leaves the breakdown off", () => {
  const { tokensUsed, tokensDetails } = summarizeRunUsage(null, null);
  assertEquals(tokensUsed, 0);
  assertEquals(tokensDetails, undefined);
});
