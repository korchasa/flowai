import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { collectCodexUsage, parseRolloutUsage } from "./codex_usage.ts";

/** One `token_count` line as codex writes it, with a cumulative total. */
function tokenCountLine(total: number, cached: number, out: number): string {
  return JSON.stringify({
    timestamp: "2026-09-15T17:38:57.203Z",
    type: "event_msg",
    payload: {
      type: "token_count",
      info: {
        total_token_usage: {
          input_tokens: total - out,
          cached_input_tokens: cached,
          cache_write_input_tokens: 0,
          output_tokens: out,
          reasoning_output_tokens: 0,
          total_tokens: total,
        },
        last_token_usage: {
          input_tokens: 1,
          cached_input_tokens: 0,
          cache_write_input_tokens: 0,
          output_tokens: 1,
          reasoning_output_tokens: 0,
          total_tokens: 2,
        },
        model_context_window: 258400,
      },
    },
  });
}

Deno.test("the LAST token_count wins — the earlier ones are prefixes of it", () => {
  // `total_token_usage` is cumulative over the session, so summing every event
  // of one rollout would multiply the session's cost by its turn count.
  const jsonl = [
    tokenCountLine(1000, 800, 50),
    tokenCountLine(3000, 2500, 120),
  ].join("\n");
  const t = parseRolloutUsage(jsonl);
  assertEquals(t?.total, 3000);
  assertEquals(t?.cachedInput, 2500);
  assertEquals(t?.output, 120);
});

Deno.test("a rollout with no token_count reports nothing", () => {
  const jsonl = JSON.stringify({
    type: "response_item",
    payload: { type: "agent_message", content: [] },
  });
  assertEquals(parseRolloutUsage(jsonl), null);
});

Deno.test("an unparsable line does not lose the rest of the file", () => {
  const jsonl = ["{not json", "", tokenCountLine(500, 100, 20)].join("\n");
  assertEquals(parseRolloutUsage(jsonl)?.total, 500);
});

Deno.test("every rollout under the home is summed — subagents included", async () => {
  const home = await Deno.makeTempDir({ prefix: "codex-usage-" });
  try {
    const day = join(home, "sessions", "2026", "09", "15");
    await Deno.mkdir(day, { recursive: true });
    await Deno.writeTextFile(
      join(day, "rollout-2026-09-15T20-38-13-parent.jsonl"),
      tokenCountLine(1000, 800, 50),
    );
    await Deno.writeTextFile(
      join(day, "rollout-2026-09-15T20-38-20-child.jsonl"),
      tokenCountLine(2000, 1500, 70),
    );
    const t = await collectCodexUsage(home);
    assertEquals(t?.total, 3000);
    assertEquals(t?.cachedInput, 2300);
    assertEquals(t?.output, 120);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("a home with no sessions directory reports nothing", async () => {
  const home = await Deno.makeTempDir({ prefix: "codex-usage-" });
  try {
    assertEquals(await collectCodexUsage(home), null);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

Deno.test("a home whose rollouts carry no counts reports nothing", async () => {
  // Distinct from "everything was free": null keeps an unmeasured arm out of
  // the report instead of showing it as a real zero.
  const home = await Deno.makeTempDir({ prefix: "codex-usage-" });
  try {
    const day = join(home, "sessions", "2026", "09", "15");
    await Deno.mkdir(day, { recursive: true });
    await Deno.writeTextFile(
      join(day, "rollout-2026-09-15T20-38-13-parent.jsonl"),
      JSON.stringify({ type: "response_item", payload: { type: "x" } }),
    );
    assertEquals(await collectCodexUsage(home), null);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});
