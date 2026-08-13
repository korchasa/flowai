/**
 * The `[tool-calls]` trace block is the only place an LLM judge learns which
 * tools ran, so how one line reads decides checklist items. Two sweeps were
 * scored wrong on this rendering alone, both on subagent dispatches, so the
 * dispatch form is pinned here.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { describeDispatchResult, describeToolCall } from "./acp_agent.ts";

Deno.test("describeToolCall names a subagent dispatch by its agent type", () => {
  const line = describeToolCall({
    toolCallId: "t1",
    title: "Enumerate affected surface",
    kind: "think",
    rawInput: { subagent_type: "surface-scout", prompt: "the request" },
  });
  assertStringIncludes(line, "subagent dispatch -> surface-scout");
  assertStringIncludes(line, "(via Task/Agent tool)");
});

Deno.test("describeToolCall drops kind on a dispatch — ACP reports 'think' for every Task call, and judges read that as an internal reasoning step rather than a tool invocation", () => {
  const line = describeToolCall({
    toolCallId: "t2",
    title: "Enumerate affected surface",
    kind: "think",
    rawInput: { subagent_type: "surface-scout" },
  });
  assertEquals(line.includes("kind="), false);
});

Deno.test("describeToolCall keeps title and labelled kind for an ordinary call", () => {
  const line = describeToolCall({
    toolCallId: "t3",
    title: "Read /tmp/a.ts",
    kind: "read",
    rawInput: { file_path: "/tmp/a.ts" },
  });
  assertStringIncludes(line, "Read /tmp/a.ts");
  assertStringIncludes(line, "[kind=read]");
});

Deno.test("describeToolCall carries a dispatch's returned text into the trace so a quotation can be checked against its source", () => {
  const line = describeToolCall({
    toolCallId: "t5",
    title: "Enumerate affected surface",
    kind: "think",
    rawInput: { subagent_type: "surface-scout" },
    resultText: "## Surface\n- legacy/exporters/report_writer.py — third copy",
  });
  assertStringIncludes(line, "-> returned:");
  assertStringIncludes(line, "legacy/exporters/report_writer.py");
});

Deno.test("describeDispatchResult says so when no payload was captured, rather than rendering an empty result that reads like an empty answer", () => {
  assertStringIncludes(
    describeDispatchResult(undefined),
    "(no result payload captured for this dispatch)",
  );
});

Deno.test("describeDispatchResult truncates a long payload and says how much it dropped", () => {
  const out = describeDispatchResult("x".repeat(5000));
  assertStringIncludes(out, "[truncated 1000 chars]");
  assertEquals(out.length < 5000, true);
});

Deno.test("describeToolCall ignores a non-string subagent_type", () => {
  const line = describeToolCall({
    toolCallId: "t4",
    title: "Some call",
    kind: "other",
    rawInput: { subagent_type: 7 },
  });
  assertStringIncludes(line, "Some call [kind=other]");
});
