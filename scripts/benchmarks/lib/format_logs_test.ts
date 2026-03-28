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
