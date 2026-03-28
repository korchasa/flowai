/**
 * Converts raw agent output (NDJSON stream-json) into human-readable
 * conversation format for the LLM judge. Preserves all data.
 */

interface StreamEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  result?: string;
  is_error?: boolean;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: unknown;
      content?: unknown;
      tool_use_id?: string;
    }>;
  };
}

const MAX_TOOL_RESULT_LEN = 2_000;

/**
 * Formats raw agent logs for the judge.
 * - "stream-json": parses NDJSON, emits readable sections per event
 * - other formats: returns as-is
 */
export function formatAgentLogs(
  rawLogs: string,
  format: "stream-json" | "json" | string,
): string {
  if (format !== "stream-json") return rawLogs;

  const parts: string[] = [];

  for (const line of rawLogs.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let event: StreamEvent;
    try {
      event = JSON.parse(trimmed);
    } catch {
      // Non-JSON lines (e.g. [USER INPUT], [stderr]) — keep as-is
      parts.push(line);
      continue;
    }

    if (!event.type) continue;

    switch (event.type) {
      case "assistant": {
        if (!event.message?.content) break;
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            parts.push(`## Assistant\n${block.text}`);
          } else if (block.type === "tool_use") {
            const input = block.input
              ? JSON.stringify(block.input, null, 2)
              : "";
            parts.push(`## Tool: ${block.name || "unknown"}\n${input}`);
          } else if (block.type === "tool_result") {
            let content = typeof block.content === "string"
              ? block.content
              : JSON.stringify(block.content);
            if (content.length > MAX_TOOL_RESULT_LEN) {
              content = content.slice(0, MAX_TOOL_RESULT_LEN) +
                "\n...[TRUNCATED]";
            }
            parts.push(`## Tool Result\n${content}`);
          }
        }
        break;
      }
      case "result": {
        if (event.result) {
          const label = event.is_error ? "Error Result" : "Final Result";
          parts.push(`## ${label}\n${event.result}`);
        }
        if (event.subtype) {
          parts.push(`[subtype: ${event.subtype}]`);
        }
        break;
      }
      case "system": {
        if (event.message?.content) {
          const text = event.message.content
            .filter((b) => b.type === "text" && b.text)
            .map((b) => b.text)
            .join("\n");
          if (text) parts.push(`## System\n${text}`);
        }
        break;
      }
        // Skip: session_id events, metadata-only events
    }
  }

  return parts.join("\n\n");
}
