/**
 * Turn recorder (FR-ACCEPT.ACP) — what the acceptance trace keeps of an ACP
 * session, fed with the raw `session/update` params the ai-ide-cli session
 * hands to its `onEvent` callback.
 *
 * It holds, per run: the reply and the reasoning of the turn in flight, kept
 * apart; that turn's timeline in arrival order; and every tool call merged
 * across its `tool_call` / `tool_call_update` notifications. The library
 * passes each notification through as it arrived, with no schema check, so a
 * dispatch whose `rawOutput` is a bare string reaches the trace like any other.
 */
import type { ParsedAgentOutput } from "../adapters/types.ts";

/**
 * One entry of a turn's timeline: what the agent emitted, in arrival order.
 *
 * The reply, reasoning and tool-call stores are unordered with respect to each
 * other, so a trace built from them alone prints every sentence of a turn and
 * then every call — and a judge cannot tell a command run before the verdict
 * from one run after it. Adjacent chunks of the same kind merge into one entry.
 */
export type TurnEvent =
  | { type: "reply"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool"; toolCallId: string };

/**
 * A tool invocation observed during the run, captured deterministically from
 * ACP `tool_call` / `tool_call_update` notifications. Consumed by the runner
 * to decide skill-invocation checklist items WITHOUT asking the LLM judge.
 *
 * Client-side `fs/read_text_file` requests are deliberately NOT recorded: they
 * include reads delegated by EXPLORE subagents during project mapping (e.g.
 * listing `.claude/skills/*\/SKILL.md`), which are not the main agent's
 * skill-invocation decision and caused false positives on `skill_not_invoked`
 * scenarios. Invocation is detected from `tool_call` notifications only.
 */
export interface CapturedToolCall {
  toolCallId: string;
  title: string;
  kind?: string;
  rawInput?: Record<string, unknown>;
  locations?: { path: string }[];
  /**
   * Flattened text of the call's RESULT.
   *
   * Source order matters: ACP's `rawOutput` is the tool's actual return value,
   * while `content` is a display collection that claude-code-acp populates for
   * a subagent dispatch with an ECHO OF THE PROMPT. Reading `content` first
   * therefore rendered `-> returned: <the original user request>` and a judge
   * reasonably concluded "the scout returned an echo of the input"
   * (2026-08-13, plan-uses-scout-findings). `rawOutput` wins; `content` is the
   * fallback for tools that fill only it.
   */
  resultText?: string;
}

/**
 * Narrows a tool call's `rawInput` to the record the deterministic detector
 * reads. ACP puts no shape on it.
 */
export function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? v as Record<string, unknown>
    : undefined;
}

/** Flattens ACP `rawOutput` — the tool's real return value — into text. */
export function flattenRawOutput(rawOutput: unknown): string | undefined {
  if (rawOutput === undefined || rawOutput === null) return undefined;
  if (typeof rawOutput === "string") {
    return rawOutput.length > 0 ? rawOutput : undefined;
  }
  // A dispatch answers with the subagent's content blocks at the top level.
  // Left to the JSON fallback the judge reads the report as one escaped line.
  if (Array.isArray(rawOutput)) return flattenToolCallContent(rawOutput);
  const fromContent = flattenToolCallContent(
    (rawOutput as { content?: unknown }).content,
  );
  if (fromContent) return fromContent;
  const json = JSON.stringify(rawOutput);
  return json && json !== "{}" ? json : undefined;
}

/** Flattens ACP tool-call `content` blocks into the text a judge can read. */
export function flattenToolCallContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const parts: string[] = [];
  for (const block of content) {
    const inner = (block as { content?: unknown })?.content ?? block;
    const text = (inner as { text?: unknown })?.text;
    if (typeof text === "string" && text.length > 0) parts.push(text);
  }
  return parts.length > 0 ? parts.join("\n") : undefined;
}

/** Records one ACP session's turns for the acceptance trace. */
export class TurnRecorder {
  #reply: string[] = [];
  #reasoning: string[] = [];
  #timeline: TurnEvent[] = [];
  /** Tool calls observed this run, keyed by toolCallId (ordered by Map). */
  readonly #toolCalls = new Map<string, CapturedToolCall>();

  /** Clears the per-turn buffers; tool calls accumulate across the run. */
  startTurn(): void {
    this.#reply = [];
    this.#reasoning = [];
    this.#timeline = [];
  }

  /**
   * Takes the params of one `session/update` notification. Anything else, and
   * any update this trace does not keep, is ignored.
   */
  observe(params: Record<string, unknown>): void {
    const u = asRecord(params["update"]);
    const kind = u?.["sessionUpdate"];
    if (kind === "agent_message_chunk" || kind === "agent_thought_chunk") {
      const content = asRecord(u?.["content"]);
      if (content?.["type"] !== "text" || typeof content["text"] !== "string") {
        return;
      }
      // implements [FR-ACCEPT.ACP](../../../../documents/requirements.md#fr-accept.acp-acp-transport-for-acceptance-test-runner-ancfraccept.acp):
      // Reply and reasoning are graded differently, so they are never mixed:
      // the judge scores the reply's prose, and reasoning reaches the trace
      // under its own marker.
      const text = content["text"];
      if (kind === "agent_thought_chunk") this.#reasoning.push(text);
      else this.#reply.push(text);
      appendText(
        this.#timeline,
        kind === "agent_thought_chunk" ? "reasoning" : "reply",
        text,
      );
      return;
    }
    if (kind !== "tool_call" && kind !== "tool_call_update") return;
    const id = u?.["toolCallId"];
    if (typeof id !== "string" || id.length === 0) return;
    // [REF:fr:accept.acp | FR-ACCEPT.ACP] — text and calls share one
    // timeline, so they keep the order they arrived in.
    if (!this.#timeline.some((e) => e.type === "tool" && e.toolCallId === id)) {
      this.#timeline.push({ type: "tool", toolCallId: id });
    }
    const prev = this.#toolCalls.get(id) ?? { toolCallId: id, title: "" };
    const result = flattenRawOutput(u?.["rawOutput"]) ??
      flattenToolCallContent(u?.["content"]);
    const locations = Array.isArray(u?.["locations"])
      ? (u["locations"] as Array<{ path?: unknown }>)
        .filter((l) => typeof l?.path === "string")
        .map((l) => ({ path: l.path as string }))
      : undefined;
    this.#toolCalls.set(id, {
      ...prev,
      title: typeof u?.["title"] === "string" ? u["title"] : prev.title,
      kind: typeof u?.["kind"] === "string" ? u["kind"] : prev.kind,
      rawInput: asRecord(u?.["rawInput"]) ?? prev.rawInput,
      locations: locations ?? prev.locations,
      // A closing notification's own result wins over the prompt the opening
      // one carried; absent a result, whatever was already captured stands.
      resultText: kind === "tool_call_update"
        ? result ?? prev.resultText
        : prev.resultText ?? result,
    });
  }

  /** All tool calls observed so far across every turn of the run. */
  getToolCalls(): CapturedToolCall[] {
    return [...this.#toolCalls.values()];
  }

  /** Reply text of the turn in flight (or the last one). */
  getBufferedText(): string {
    return this.#reply.join("");
  }

  /** Reasoning of the turn in flight (or the last one). */
  getBufferedReasoning(): string {
    return this.#reasoning.join("");
  }

  /** Timeline of the turn in flight — complete once the turn has ended. */
  getTimeline(): TurnEvent[] {
    return [...this.#timeline];
  }

  /**
   * The finished turn in the `ParsedAgentOutput` shape the judge, tracer and
   * `UserEmulator` consume.
   */
  turnOutput(sessionId: string, stopReason: string): ParsedAgentOutput {
    const assistantText = this.getBufferedText() || null;
    return {
      sessionId,
      result: assistantText,
      subtype: stopReason === "end_turn" ? "success" : stopReason,
      assistantText,
      reasoningText: this.getBufferedReasoning() || null,
      raw: { stopReason },
    };
  }

  /**
   * A turn that died: no reply, a deterministic `subtype:"error"` verdict
   * (the judge's `exit_code_zero` failure path), and whatever reasoning it
   * produced before it died.
   */
  failureOutput(sessionId: string, cause: unknown): ParsedAgentOutput {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return {
      sessionId,
      result: null,
      subtype: "error",
      assistantText: null,
      reasoningText: this.getBufferedReasoning() || null,
      raw: { acpError: reason },
    };
  }
}

/** Appends a text chunk, merging it into the previous entry of the same kind. */
function appendText(
  timeline: TurnEvent[],
  type: "reply" | "reasoning",
  text: string,
): void {
  const last = timeline[timeline.length - 1];
  if (last && last.type === type) last.text += text;
  else timeline.push({ type, text });
}
