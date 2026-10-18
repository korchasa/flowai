import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  collectCodexAgentTrace,
  collectCodexTurnErrors,
  parseCodexRollout,
  parseCodexTurnErrors,
  renderCodexAgentTrace,
} from "./codex_rollout.ts";

const SPAWN = JSON.stringify({
  type: "response_item",
  payload: {
    type: "function_call",
    name: "spawn_agent",
    arguments: JSON.stringify({
      task_name: "surface_check",
      agent_type: "surface-scout",
      fork_turns: "none",
      message: "enc",
    }),
  },
});
const FINAL = JSON.stringify({
  type: "response_item",
  payload: {
    type: "agent_message",
    author: "/root/surface_check",
    recipient: "/root",
    content: [{
      type: "input_text",
      text:
        "Message Type: FINAL_ANSWER\nSender: /root/surface_check\nPayload:\n## Surface\n- a.ts",
    }],
  },
});
const NOISE = JSON.stringify({
  type: "event_msg",
  payload: { type: "token_count" },
});

Deno.test("parseCodexRollout keeps spawn_agent calls and inter-agent messages only", () => {
  const events = parseCodexRollout(
    [SPAWN, NOISE, "not json", FINAL].join("\n"),
  );
  assertEquals(events, [
    {
      kind: "spawn",
      taskName: "surface_check",
      agentType: "surface-scout",
      forkTurns: "none",
    },
    {
      kind: "message",
      author: "/root/surface_check",
      recipient: "/root",
      text:
        "Message Type: FINAL_ANSWER\nSender: /root/surface_check\nPayload:\n## Surface\n- a.ts",
    },
  ]);
});

const ENCRYPTED_TASK = JSON.stringify({
  type: "response_item",
  payload: {
    type: "agent_message",
    author: "/root",
    recipient: "/root/surface_check",
    content: [
      {
        type: "input_text",
        text: "Message Type: NEW_TASK\nSender: /root\nPayload:\n",
      },
      { type: "encrypted_content", encrypted_content: "gAAAAABqnaQa4Bms" },
    ],
  },
});

Deno.test("parseCodexRollout marks an encrypted payload instead of rendering it as empty", () => {
  // codex 0.145.0 stores the NEW_TASK payload as an `encrypted_content` part; dropping it made the
  // dispatch read as an empty prompt and `no_fix_site_leak_to_scout` warned on
  // plan-affected-surface-scout (2026-09-06) that the request was never passed to the scout.
  const events = parseCodexRollout(ENCRYPTED_TASK);
  assertEquals(events.length, 1);
  const e = events[0];
  if (e.kind !== "message") throw new Error("expected a message event");
  assertStringIncludes(e.text, "Message Type: NEW_TASK");
  assertStringIncludes(e.text, "[payload encrypted by codex");
  assertStringIncludes(e.text, "not evidence");
  assertEquals(e.text.includes("gAAAAAB"), false);
});

Deno.test("renderCodexAgentTrace names the agent type on the dispatch and quotes the reply", () => {
  const out = renderCodexAgentTrace(
    parseCodexRollout([SPAWN, FINAL].join("\n")),
  );
  assertStringIncludes(out, "[codex-agents]");
  assertStringIncludes(
    out,
    "spawn_agent -> surface-scout (task_name=surface_check, fork_turns=none)",
  );
  assertStringIncludes(out, "message /root/surface_check -> /root:");
  assertStringIncludes(out, "## Surface");
  assertEquals(renderCodexAgentTrace([]), "");
});

Deno.test("collectCodexAgentTrace walks every rollout under CODEX_HOME/sessions", async () => {
  const home = await Deno.makeTempDir();
  try {
    const dir = join(home, "sessions", "2026", "09", "05");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      join(dir, "rollout-2026-09-05T03-24-37-aaaa.jsonl"),
      SPAWN + "\n",
    );
    await Deno.writeTextFile(
      join(dir, "rollout-2026-09-05T03-24-58-bbbb.jsonl"),
      FINAL + "\n",
    );
    const out = await collectCodexAgentTrace(home);
    assertStringIncludes(out, "spawn_agent -> surface-scout");
    assertStringIncludes(out, "message /root/surface_check -> /root:");
    assertEquals(await collectCodexAgentTrace(join(home, "missing")), "");
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});

// The last line of the rollout `review-commit-push-trigger-pos-1` left on
// 2026-10-06 (run 2026-10-06T15-29-37): the turn ended without a single tool
// call, and the bridge reported it as an ordinary reply with exit code 0.
const OVERLOADED = JSON.stringify({
  timestamp: "2026-10-06T15:37:55.123Z",
  type: "event_msg",
  payload: {
    type: "task_complete",
    turn_id: "01a111dd-2f16-7c52-b550-fd8d4e7a81cd",
    last_agent_message: null,
    error: {
      message: "Selected model is at capacity. Please try a different model.",
      codex_error_info: "server_overloaded",
    },
    started_at: 1791301070,
    completed_at: 1791301075,
    duration_ms: 5059,
  },
});

Deno.test("parseCodexTurnErrors reads the server_overloaded abort of 2026-10-06", () => {
  assertEquals(parseCodexTurnErrors([SPAWN, OVERLOADED, ""].join("\n")), [{
    kind: "server_overloaded",
    message: "Selected model is at capacity. Please try a different model.",
  }]);
});

Deno.test("parseCodexTurnErrors: a turn that completed cleanly carries no error", () => {
  const clean = JSON.stringify({
    type: "event_msg",
    payload: { type: "task_complete", last_agent_message: "Done." },
  });
  assertEquals(parseCodexTurnErrors(clean + "\nnot json\n"), []);
});

Deno.test("parseCodexTurnErrors: a variant with a payload is named by its key", () => {
  const line = JSON.stringify({
    type: "event_msg",
    payload: {
      type: "task_complete",
      error: {
        message: "stream disconnected",
        codex_error_info: {
          response_stream_disconnected: { http_status_code: 502 },
        },
      },
    },
  });
  assertEquals(parseCodexTurnErrors(line), [{
    kind: "response_stream_disconnected",
    message: "stream disconnected",
  }]);
});

Deno.test("collectCodexTurnErrors walks every rollout under CODEX_HOME/sessions", async () => {
  const home = await Deno.makeTempDir();
  try {
    const dir = join(home, "sessions", "2026", "10", "06");
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      join(dir, "rollout-2026-10-06T18-37-50-aaaa.jsonl"),
      OVERLOADED + "\n",
    );
    await Deno.writeTextFile(
      join(dir, "rollout-2026-10-06T18-38-10-bbbb.jsonl"),
      SPAWN + "\n",
    );
    const errors = await collectCodexTurnErrors(home);
    assertEquals(errors.map((e) => e.kind), ["server_overloaded"]);
    assertEquals(await collectCodexTurnErrors(join(home, "missing")), []);
  } finally {
    await Deno.remove(home, { recursive: true });
  }
});
