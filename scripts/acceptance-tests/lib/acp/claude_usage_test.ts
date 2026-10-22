import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { collectClaudeUsage, parseClaudeTranscript } from "./claude_usage.ts";

/** One `assistant` line as Claude Code writes it: one API response may span
 * several of these, sharing `message.id` and repeating its usage. */
function assistantLine(
  id: string,
  usage: Record<string, unknown>,
  content: unknown[] = [],
): string {
  return JSON.stringify({
    type: "assistant",
    message: { id, role: "assistant", content, usage },
  });
}

const USAGE_A = {
  input_tokens: 10,
  cache_read_input_tokens: 1000,
  cache_creation_input_tokens: 200,
  output_tokens: 50,
  output_tokens_details: { thinking_tokens: 20 },
};

Deno.test("lines sharing a message id count once — the last one wins", () => {
  const jsonl = [
    assistantLine("msg_1", { ...USAGE_A, output_tokens: 5 }),
    assistantLine("msg_1", USAGE_A, [
      { type: "tool_use", id: "toolu_1", name: "Bash", input: {} },
    ]),
    assistantLine("msg_1", USAGE_A, [
      { type: "tool_use", id: "toolu_1", name: "Bash", input: {} },
    ]),
  ].join("\n");
  const r = parseClaudeTranscript(jsonl);
  assertEquals(r.apiCalls, 1);
  assertEquals(r.toolCalls, 1);
  assertEquals(r.parseErrors, 0);
  assertEquals(r.tokens, {
    freshInput: 10,
    cachedInput: 1000,
    cacheWrite: 200,
    output: 30,
    reasoning: 20,
    total: 1260,
  });
});

Deno.test("distinct message ids are summed", () => {
  const jsonl = [
    assistantLine("msg_1", USAGE_A),
    JSON.stringify({ type: "user", message: { role: "user", content: "x" } }),
    assistantLine("msg_2", {
      input_tokens: 1,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      output_tokens: 4,
    }),
  ].join("\n");
  const r = parseClaudeTranscript(jsonl);
  assertEquals(r.apiCalls, 2);
  assertEquals(r.tokens?.output, 34);
  assertEquals(r.tokens?.reasoning, 20);
  assertEquals(r.tokens?.total, 1265);
});

Deno.test("a torn line is counted, the rest still parses", () => {
  const jsonl = [assistantLine("msg_1", USAGE_A), '{"type":"assis'].join("\n");
  const r = parseClaudeTranscript(jsonl);
  assertEquals(r.parseErrors, 1);
  assertEquals(r.apiCalls, 1);
});

Deno.test("a transcript with no usage yields null tokens", () => {
  const r = parseClaudeTranscript(
    JSON.stringify({ type: "user", message: { content: "hi" } }),
  );
  assertEquals(r.tokens, null);
  assertEquals(r.apiCalls, 0);
});

Deno.test("collectClaudeUsage sums the main transcript and its subagents", async () => {
  const home = await Deno.makeTempDir();
  try {
    const slug = join(home, ".claude", "projects", "-tmp-sandbox");
    await Deno.mkdir(join(slug, "sess-1", "subagents"), { recursive: true });
    await Deno.writeTextFile(
      join(slug, "sess-1.jsonl"),
      assistantLine("msg_1", USAGE_A),
    );
    await Deno.writeTextFile(
      join(slug, "sess-1", "subagents", "agent-a.jsonl"),
      assistantLine("msg_9", USAGE_A),
    );
    const t = await collectClaudeUsage(home);
    assertEquals(t?.total, 2520);
    assertEquals(t?.cachedInput, 2000);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("collectClaudeUsage is null when the home has no projects dir", async () => {
  const home = await Deno.makeTempDir();
  try {
    assertEquals(await collectClaudeUsage(home), null);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});
