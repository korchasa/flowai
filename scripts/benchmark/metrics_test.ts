import { assertEquals, assertRejects } from "@std/assert";
import {
  collectBenchHomeMetrics,
  loadRunMetrics,
  type SessionMetrics,
  sumCost,
  usageFromTranscript,
} from "./metrics.ts";

/** One assistant transcript line in the Claude Code jsonl shape. */
function asst(
  id: string,
  usage: Record<string, number>,
  content: unknown[] = [],
): string {
  return JSON.stringify({
    type: "assistant",
    message: { id, role: "assistant", usage, content },
  });
}

Deno.test("usageFromTranscript: dedupes usage by message id, last occurrence wins", () => {
  // One API response spans multiple lines with the same message.id; usage is
  // cumulative, so only the LAST occurrence counts.
  const text = [
    asst("m1", { input_tokens: 100, output_tokens: 1 }),
    asst("m1", {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 10,
    }),
    asst("m2", { input_tokens: 5, output_tokens: 7 }),
  ].join("\n");
  const u = usageFromTranscript(text);
  assertEquals(u.apiCalls, 2);
  assertEquals(u.inputTokens, 105);
  assertEquals(u.outputTokens, 57);
  assertEquals(u.cacheReadTokens, 200);
  assertEquals(u.cacheCreationTokens, 10);
});

Deno.test("usageFromTranscript: counts tool_use blocks once per toolu id", () => {
  const text = [
    asst("m1", { input_tokens: 1, output_tokens: 1 }, [
      { type: "tool_use", id: "toolu_1", name: "Bash" },
    ]),
    asst("m1", { input_tokens: 1, output_tokens: 2 }, [
      { type: "tool_use", id: "toolu_1", name: "Bash" },
    ]),
    asst("m2", { input_tokens: 1, output_tokens: 1 }, [
      { type: "tool_use", id: "toolu_2", name: "Read" },
      { type: "text", text: "hi" },
    ]),
  ].join("\n");
  const u = usageFromTranscript(text);
  assertEquals(u.toolCalls, 2);
});

Deno.test("usageFromTranscript: ignores non-assistant lines, counts malformed ones", () => {
  const text = [
    JSON.stringify({ type: "user", message: { role: "user", content: "go" } }),
    asst("m1", { input_tokens: 3, output_tokens: 4 }),
    '{"type":"assis', // truncated tail of a killed session
    "",
  ].join("\n");
  const u = usageFromTranscript(text);
  assertEquals(u.apiCalls, 1);
  assertEquals(u.inputTokens, 3);
  assertEquals(u.parseErrors, 1);
});

Deno.test("collectBenchHomeMetrics: sums every transcript under .claude/projects", async () => {
  const home = await Deno.makeTempDir();
  try {
    const slug = `${home}/.claude/projects/-tmp-sandbox`;
    await Deno.mkdir(`${slug}/sess/subagents`, { recursive: true });
    await Deno.writeTextFile(
      `${slug}/main.jsonl`,
      asst("m1", { input_tokens: 10, output_tokens: 20 }) + "\n",
    );
    await Deno.writeTextFile(
      `${slug}/sess/subagents/agent.jsonl`,
      asst("m2", { input_tokens: 1, output_tokens: 2 }) + "\n",
    );
    const m = await collectBenchHomeMetrics(home, 5000);
    assertEquals(m.wallClockMs, 5000);
    assertEquals(m.transcriptFiles, 2);
    assertEquals(m.apiCalls, 2);
    assertEquals(m.inputTokens, 11);
    assertEquals(m.outputTokens, 22);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("collectBenchHomeMetrics: missing projects dir fails fast", async () => {
  const home = await Deno.makeTempDir();
  try {
    await assertRejects(
      () => collectBenchHomeMetrics(home, 1),
      Error,
      "projects",
    );
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

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
