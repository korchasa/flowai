import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import {
  collectCodexAgentTrace,
  parseCodexRollout,
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
