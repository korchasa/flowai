/**
 * Converts raw agent output (NDJSON stream-json) into human-readable
 * conversation format for the LLM judge. Preserves all data.
 *
 * Supports both Claude Code and OpenAI Codex event schemas. Codex uses
 * `thread.started`, `item.started`, `item.completed`, `turn.completed`,
 * `turn.failed`, `error` event types (see `CodexAdapter.parseOutput` in
 * `scripts/acceptance-tests/lib/adapters/codex.ts` and the probes in
 * `documents/tasks/2026-04-11-add-codex-ide-support.md`).
 */

interface StreamEvent {
  type?: string;
  subtype?: string;
  session_id?: string;
  thread_id?: string;
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
  /** Codex error events emit a top-level `message` as a plain string; kept
   * separate from the Claude-style object `message` to avoid a union type
   * that breaks type narrowing in the assistant/system cases. */
  errorMessage?: string;
  item?: {
    id?: string;
    type?: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number | null;
    status?: string;
  };
  error?: { message?: string };
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
      const raw = JSON.parse(trimmed) as Record<string, unknown>;
      // Codex error events emit `message` as a plain string, but the Claude
      // assistant/system events put an object in the same field. Normalise
      // a string-valued `message` into a separate `errorMessage` key so the
      // StreamEvent type can keep `message` as an object.
      if (typeof raw.message === "string") {
        event = {
          ...(raw as unknown as StreamEvent),
          message: undefined,
          errorMessage: raw.message,
        };
      } else {
        event = raw as unknown as StreamEvent;
      }
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
      // Codex event schema (codex-cli 0.118.0+).
      case "thread.started": {
        if (event.thread_id) {
          parts.push(`## System\nCodex thread started: ${event.thread_id}`);
        }
        break;
      }
      case "turn.started":
      case "turn.completed":
        // Lifecycle markers — no content. Skip.
        break;
      case "turn.failed": {
        const msg = event.error?.message ?? "turn failed";
        parts.push(`## Error Result\n${msg}\n[subtype: error]`);
        break;
      }
      case "item.started":
        // Streaming start — wait for `item.completed` to get the full text.
        break;
      case "item.completed": {
        const item = event.item;
        if (!item?.type) break;
        if (item.type === "agent_message" && item.text) {
          parts.push(`## Assistant\n${item.text}`);
        } else if (item.type === "command_execution") {
          const cmd = item.command ?? "";
          parts.push(`## Tool: command_execution\n${cmd}`);
          const output = item.aggregated_output ?? "";
          if (output) {
            let content = output;
            if (content.length > MAX_TOOL_RESULT_LEN) {
              content = content.slice(0, MAX_TOOL_RESULT_LEN) +
                "\n...[TRUNCATED]";
            }
            parts.push(
              `## Tool Result (exit ${item.exit_code ?? "?"})\n${content}`,
            );
          }
        } else if (item.type === "error") {
          const text = event.errorMessage ?? "";
          if (text) parts.push(`## Error\n${text}`);
        }
        break;
      }
      case "error": {
        const msg = event.errorMessage ?? event.error?.message ?? "unknown";
        parts.push(`## Error\n${msg}`);
        break;
      }
        // Skip: session_id events, metadata-only events
    }
  }

  return parts.join("\n\n");
}
