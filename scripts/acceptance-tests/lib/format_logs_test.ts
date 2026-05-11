import { assertEquals, assertStringIncludes } from "@std/assert";
import { formatAgentLogs } from "./format_logs.ts";

Deno.test("formatAgentLogs - converts NDJSON to readable format", () => {
  const ndjson = [
    JSON.stringify({ type: "session_id", session_id: "abc-123" }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [{ type: "text", text: "Hello, I will help you." }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [{
          type: "tool_use",
          name: "Bash",
          input: { command: "ls -la" },
        }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [{
          type: "tool_result",
          content: "file1.txt\nfile2.txt",
        }],
      },
    }),
    JSON.stringify({
      type: "result",
      result: "Task completed successfully",
      subtype: "end_turn",
    }),
  ].join("\n");

  const result = formatAgentLogs(ndjson, "stream-json");

  assertStringIncludes(result, "## Assistant\nHello, I will help you.");
  assertStringIncludes(result, '## Tool: Bash\n{\n  "command": "ls -la"\n}');
  assertStringIncludes(result, "## Tool Result\nfile1.txt\nfile2.txt");
  assertStringIncludes(
    result,
    "## Final Result\nTask completed successfully",
  );
  assertStringIncludes(result, "[subtype: end_turn]");
  // session_id events should be skipped
  assertEquals(result.includes("abc-123"), false);
});

Deno.test("formatAgentLogs - preserves non-JSON lines", () => {
  const logs = [
    "[USER INPUT] yes",
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Got it." }] },
    }),
    "[stderr] some warning",
  ].join("\n");

  const result = formatAgentLogs(logs, "stream-json");

  assertStringIncludes(result, "[USER INPUT] yes");
  assertStringIncludes(result, "## Assistant\nGot it.");
  assertStringIncludes(result, "[stderr] some warning");
});

Deno.test("formatAgentLogs - passes through non-stream-json format", () => {
  const raw = "some raw output\nline 2";
  assertEquals(formatAgentLogs(raw, "json"), raw);
});

Deno.test("formatAgentLogs - truncates long tool results", () => {
  const longContent = "x".repeat(5000);
  const ndjson = JSON.stringify({
    type: "assistant",
    message: {
      content: [{ type: "tool_result", content: longContent }],
    },
  });

  const result = formatAgentLogs(ndjson, "stream-json");

  assertStringIncludes(result, "...[TRUNCATED]");
  // Should be much shorter than the original 5000 chars
  assertEquals(result.length < 3000, true);
});

Deno.test("formatAgentLogs - handles error results", () => {
  const ndjson = JSON.stringify({
    type: "result",
    result: "Something went wrong",
    is_error: true,
  });

  const result = formatAgentLogs(ndjson, "stream-json");

  assertStringIncludes(result, "## Error Result\nSomething went wrong");
});

// --- Codex event schema (codex-cli 0.118.0+) ---
Deno.test("formatAgentLogs - Codex thread.started → System section", () => {
  const ndjson = JSON.stringify({
    type: "thread.started",
    thread_id: "019d7d56-af20-7e02-81a6-69cfa0ec1ee3",
  });
  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(
    result,
    "## System\nCodex thread started: 019d7d56-af20-7e02-81a6-69cfa0ec1ee3",
  );
});

Deno.test("formatAgentLogs - Codex item.completed agent_message → Assistant section", () => {
  const ndjson = [
    JSON.stringify({ type: "thread.started", thread_id: "sess-1" }),
    JSON.stringify({
      type: "item.completed",
      item: { id: "item_0", type: "agent_message", text: "Rewritten text." },
    }),
    JSON.stringify({ type: "turn.completed" }),
  ].join("\n");

  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(result, "## Assistant\nRewritten text.");
});

Deno.test("formatAgentLogs - Codex command_execution → Tool + Tool Result sections", () => {
  const ndjson = JSON.stringify({
    type: "item.completed",
    item: {
      id: "item_2",
      type: "command_execution",
      command: '/bin/zsh -lc "ls -la"',
      aggregated_output: "total 4\ndrwx 2 user user\nsome_file.txt\n",
      exit_code: 0,
      status: "completed",
    },
  });
  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(result, "## Tool: command_execution\n/bin/zsh -lc");
  assertStringIncludes(result, "## Tool Result (exit 0)\ntotal 4");
});

Deno.test("formatAgentLogs - Codex turn.failed → Error Result section", () => {
  const ndjson = JSON.stringify({
    type: "turn.failed",
    error: { message: "rate limited" },
  });
  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(result, "## Error Result\nrate limited");
  assertStringIncludes(result, "[subtype: error]");
});

Deno.test("formatAgentLogs - Codex error event → Error section", () => {
  const ndjson = JSON.stringify({
    type: "error",
    message: "Transport channel closed",
  });
  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(result, "## Error\nTransport channel closed");
});

Deno.test("formatAgentLogs - full Codex session produces readable transcript", () => {
  const ndjson = [
    JSON.stringify({ type: "thread.started", thread_id: "sess-9" }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({
      type: "item.started",
      item: { id: "item_0", type: "agent_message", text: "" },
    }),
    JSON.stringify({
      type: "item.completed",
      item: { id: "item_0", type: "agent_message", text: "Step 1 done." },
    }),
    JSON.stringify({
      type: "item.completed",
      item: {
        id: "item_1",
        type: "command_execution",
        command: "ls",
        aggregated_output: "README.md\n",
        exit_code: 0,
        status: "completed",
      },
    }),
    JSON.stringify({
      type: "item.completed",
      item: { id: "item_2", type: "agent_message", text: "Final answer." },
    }),
    JSON.stringify({ type: "turn.completed" }),
  ].join("\n");
  const result = formatAgentLogs(ndjson, "stream-json");
  assertStringIncludes(result, "## System\nCodex thread started: sess-9");
  assertStringIncludes(result, "## Assistant\nStep 1 done.");
  assertStringIncludes(result, "## Tool: command_execution\nls");
  assertStringIncludes(result, "## Tool Result (exit 0)\nREADME.md");
  assertStringIncludes(result, "## Assistant\nFinal answer.");
});
