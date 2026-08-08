import { assertEquals, assertRejects } from "@std/assert";
import {
  collectBenchHomeMetrics,
  loadRunMetrics,
  type SessionMetrics,
  sumCost,
  usageFromRollout,
} from "./metrics.ts";

function metrics(over: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    wallClockMs: 1000,
    transcriptFiles: 1,
    apiCalls: 2,
    inputTokens: 10,
    outputTokens: 20,
    cacheReadTokens: 30,
    cacheCreationTokens: 40,
    toolCalls: 5,
    parseErrors: 0,
    ...over,
  };
}

Deno.test("loadRunMetrics: reads <out>/<arm>/<instance>/<instance>.metrics.json", async () => {
  const out = await Deno.makeTempDir();
  try {
    for (
      const [arm, id] of [["baseline", "i1"], ["flowai", "i1"], [
        "flowai",
        "i2",
      ]]
    ) {
      const dir = `${out}/${arm}/${id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/${id}.metrics.json`,
        JSON.stringify(metrics()),
      );
    }
    const byArm = await loadRunMetrics(out);
    assertEquals(byArm.baseline?.length, 1);
    assertEquals(byArm.flowai?.length, 2);
    assertEquals(byArm.baseline?.[0].instanceId, "i1");
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("loadRunMetrics: empty when no metrics files exist", async () => {
  const out = await Deno.makeTempDir();
  try {
    const byArm = await loadRunMetrics(out);
    assertEquals(byArm.baseline, undefined);
    assertEquals(byArm.flowai, undefined);
  } finally {
    await Deno.remove(out, { recursive: true });
  }
});

Deno.test("sumCost: totals a list of session metrics", () => {
  const t = sumCost([metrics(), metrics({ inputTokens: 5, apiCalls: 1 })]);
  assertEquals(t.instances, 2);
  assertEquals(t.apiCalls, 3);
  assertEquals(t.inputTokens, 15);
  assertEquals(t.wallClockMs, 2000);
});

/** One codex rollout line carrying cumulative token counters. */
function tokenCount(total: Record<string, number>): string {
  return JSON.stringify({
    type: "event_msg",
    payload: {
      type: "token_count",
      info: { total_token_usage: total, last_token_usage: total },
    },
  });
}

/** One codex rollout line describing a tool invocation. */
function fnCall(id: string, name: string): string {
  return JSON.stringify({
    type: "response_item",
    payload: { type: "function_call", id, name },
  });
}

Deno.test("usageFromRollout: total_token_usage is cumulative, last occurrence wins", () => {
  // Codex re-emits the running total after every API response, so summing the
  // events would multiply the real cost. Only the final event counts.
  const text = [
    tokenCount({
      input_tokens: 100,
      cached_input_tokens: 40,
      output_tokens: 10,
      total_tokens: 110,
    }),
    tokenCount({
      input_tokens: 320,
      cached_input_tokens: 250,
      output_tokens: 45,
      reasoning_output_tokens: 12,
      total_tokens: 365,
    }),
  ].join("\n");
  const u = usageFromRollout(text);
  assertEquals(u.inputTokens, 320);
  assertEquals(u.cacheReadTokens, 250);
  assertEquals(u.outputTokens, 45);
  // One token_count event per API response.
  assertEquals(u.apiCalls, 2);
  // Codex reports no cache-creation counter; the field stays zero rather than
  // borrowing a number that means something else.
  assertEquals(u.cacheCreationTokens, 0);
});

Deno.test("usageFromRollout: dedupes tool calls by function_call id", () => {
  const text = [
    fnCall("fc_1", "exec"),
    fnCall("fc_1", "exec"),
    fnCall("fc_2", "exec"),
    tokenCount({ input_tokens: 1, output_tokens: 1, total_tokens: 2 }),
  ].join("\n");
  assertEquals(usageFromRollout(text).toolCalls, 2);
});

Deno.test("usageFromRollout: counts malformed lines instead of dropping them", () => {
  const text = [
    tokenCount({ input_tokens: 7, output_tokens: 3, total_tokens: 10 }),
    "{not json",
    "",
  ].join("\n");
  const u = usageFromRollout(text);
  assertEquals(u.inputTokens, 7);
  assertEquals(u.parseErrors, 1);
});

Deno.test("collectBenchHomeMetrics: harvests codex rollouts under CODEX_HOME", async () => {
  const benchHome = await Deno.makeTempDir();
  try {
    const sessions = `${benchHome}/.codex/sessions/2026/08/09`;
    await Deno.mkdir(sessions, { recursive: true });
    await Deno.writeTextFile(
      `${sessions}/rollout-a.jsonl`,
      [
        fnCall("fc_a", "exec"),
        tokenCount({
          input_tokens: 200,
          cached_input_tokens: 100,
          output_tokens: 20,
          total_tokens: 220,
        }),
      ].join("\n"),
    );
    const m = await collectBenchHomeMetrics(benchHome, 1234);
    assertEquals(m.transcriptFiles, 1);
    assertEquals(m.inputTokens, 200);
    assertEquals(m.cacheReadTokens, 100);
    assertEquals(m.outputTokens, 20);
    assertEquals(m.toolCalls, 1);
    assertEquals(m.wallClockMs, 1234);
  } finally {
    await Deno.remove(benchHome, { recursive: true });
  }
});

Deno.test("collectBenchHomeMetrics: fails fast when the sessions dir is absent", async () => {
  const benchHome = await Deno.makeTempDir();
  try {
    await assertRejects(() => collectBenchHomeMetrics(benchHome, 1));
  } finally {
    await Deno.remove(benchHome, { recursive: true });
  }
});
