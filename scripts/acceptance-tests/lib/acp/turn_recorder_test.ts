/**
 * TurnRecorder tests (FR-ACCEPT.ACP): what the acceptance trace keeps of an ACP
 * session, fed raw `session/update` params as the ai-ide-cli session hands them
 * to `onEvent`. The client-fs path rules moved to ai-ide-cli (FR-L56) with
 * their tests.
 */
import { assertEquals } from "@std/assert";
import {
  flattenRawOutput,
  flattenToolCallContent,
  TurnRecorder,
} from "./turn_recorder.ts";

const update = (u: Record<string, unknown>) => ({
  sessionId: "s",
  update: u,
});

Deno.test("reply and reasoning stay apart and keep their arrival order", () => {
  const r = new TurnRecorder();
  r.startTurn();
  r.observe(update({
    sessionUpdate: "agent_thought_chunk",
    content: { type: "text", text: "Checking" },
  }));
  r.observe(update({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "Done" },
  }));
  r.observe(update({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "." },
  }));
  assertEquals(r.getBufferedReasoning(), "Checking");
  assertEquals(r.getBufferedText(), "Done.");
  assertEquals(r.getTimeline(), [
    { type: "reasoning", text: "Checking" },
    { type: "reply", text: "Done." },
  ]);
  assertEquals(r.turnOutput("s", "end_turn").subtype, "success");
});

Deno.test("a tool call merges its opening and closing notifications, the closing result winning", () => {
  const r = new TurnRecorder();
  r.startTurn();
  r.observe(update({
    sessionUpdate: "tool_call",
    toolCallId: "t1",
    title: "Task",
    kind: "think",
    rawInput: { subagent_type: "surface-scout" },
    content: [{
      type: "content",
      content: { type: "text", text: "the prompt" },
    }],
  }));
  // A bare-string rawOutput, the shape claude-code-acp closes a dispatch with.
  r.observe(update({
    sessionUpdate: "tool_call_update",
    toolCallId: "t1",
    status: "completed",
    rawOutput: "## Surface",
  }));
  const [call] = r.getToolCalls();
  assertEquals(call.title, "Task");
  assertEquals(call.rawInput, { subagent_type: "surface-scout" });
  assertEquals(call.resultText, "## Surface");
  assertEquals(r.getTimeline(), [{ type: "tool", toolCallId: "t1" }]);
});

Deno.test("startTurn clears the turn buffers but keeps the run's tool calls", () => {
  const r = new TurnRecorder();
  r.startTurn();
  r.observe(
    update({ sessionUpdate: "tool_call", toolCallId: "t1", title: "x" }),
  );
  r.observe(update({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text: "one" },
  }));
  r.startTurn();
  assertEquals(r.getBufferedText(), "");
  assertEquals(r.getTimeline(), []);
  assertEquals(r.getToolCalls().length, 1);
});

Deno.test("a failed turn keeps its reasoning and carries no reply", () => {
  const r = new TurnRecorder();
  r.startTurn();
  r.observe(update({
    sessionUpdate: "agent_thought_chunk",
    content: { type: "text", text: "thinking" },
  }));
  const out = r.failureOutput("s", new Error("boom"));
  assertEquals(out.subtype, "error");
  assertEquals(out.result, null);
  assertEquals(out.reasoningText, "thinking");
  assertEquals(out.raw, { acpError: "boom" });
});
/**
 * `rawOutput` vs `content` on a tool call: claude-code-acp fills `content` for
 * a subagent dispatch with an echo of the PROMPT, so reading it first rendered
 * `-> returned: <the original request>` in the trace and a judge concluded the
 * scout had echoed its input (2026-08-13, plan-uses-scout-findings).
 */
Deno.test("flattenRawOutput reads a string return value", () => {
  assertEquals(flattenRawOutput("agentId: a1"), "agentId: a1");
});

Deno.test("flattenRawOutput reads content blocks nested in an object return value", () => {
  assertEquals(
    flattenRawOutput({ content: [{ type: "text", text: "## Surface" }] }),
    "## Surface",
  );
});

Deno.test("flattenRawOutput reads content blocks handed over at the top level", () => {
  assertEquals(
    flattenRawOutput([{ type: "text", text: "## Surface" }, {
      type: "text",
      text: "- a.ts:3",
    }]),
    "## Surface\n- a.ts:3",
  );
});

Deno.test("flattenRawOutput falls back to JSON for a shape it does not recognise, rather than dropping the result", () => {
  assertEquals(flattenRawOutput({ agentId: "a1" }), '{"agentId":"a1"}');
});

Deno.test("flattenRawOutput treats empty and absent alike so the caller can fall through to content", () => {
  assertEquals(flattenRawOutput(undefined), undefined);
  assertEquals(flattenRawOutput(null), undefined);
  assertEquals(flattenRawOutput(""), undefined);
  assertEquals(flattenRawOutput({}), undefined);
});

/**
 * Sandbox escape (2026-08-13). The ACP spec says client-fs paths are absolute,
 * but claude-code-acp forwards the model's `file_path` verbatim, so a relative
 * one arrives as-is. `Deno.writeTextFile` then resolved it against the RUNNER's
 * cwd — this repository — and a `plan-writes-task-new-frontmatter` sandbox wrote
 * `documents/tasks/2026/08/add-healthz-endpoint.md` into the real tree; other
 * runs read and rewrote the real `.github/workflows/ci.yml`, `documents/index.md`
 * and two `scripts/check-*.ts`, stripping SALP anchors. A write to the real
 * `documents/requirements.md` was attempted and missed by luck.
 */
Deno.test("flattenToolCallContent joins text blocks and ignores blocks without text", () => {
  assertEquals(
    flattenToolCallContent([
      { type: "text", text: "one" },
      { type: "image" },
      { content: { type: "text", text: "two" } },
    ]),
    "one\ntwo",
  );
  assertEquals(flattenToolCallContent(undefined), undefined);
});
