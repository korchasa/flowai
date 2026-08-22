/**
 * ACP transport client (FR-ACCEPT.ACP).
 *
 * Wraps the official `@agentclientprotocol/sdk` client over a
 * child's stdio (the child is spawned + guarded by `AcpAgent`, preserving
 * FR-ACCEPT-GUARDS). Drives one prompt turn end-to-end —
 * `initialize → session/new → session/prompt` — accumulating assistant text into
 * the existing `ParsedAgentOutput` shape so the judge, tracer and `UserEmulator`
 * consume an unchanged structure.
 *
 * Permissions: the client auto-allows every tool (the `bypassPermissions`
 * equivalent of the direct path). Tool MOCKING is handled out-of-band by
 * PATH-shadowing (`mock_bin.ts`) — a stub binary emits the canned output so the
 * model sees the mock result, which ACP's permission-deny cannot deliver.
 *
 * Error mapping (callback→Promise): connection drop / malformed frame / agent
 * error response / watchdog kill each resolve to a deterministic
 * `exit_code_zero`-style failure verdict (`subtype:"error"`) handed to the judge
 * — never an unhandled rejection. See `prompt`.
 */
import {
  type Client,
  ClientSideConnection,
  type InitializeResponse,
  ndJsonStream,
  type PromptResponse,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionNotification,
  type Stream,
} from "@agentclientprotocol/sdk";
import type { AnyMessage } from "@agentclientprotocol/sdk";
import { isAbsolute, join, normalize, resolve } from "@std/path";
import type { ParsedAgentOutput } from "../adapters/types.ts";

/**
 * FR-ACCEPT-ISOLATION: anchors a client-side fs path to the session sandbox.
 *
 * ACP declares these paths absolute, but claude-code-acp forwards the model's
 * `file_path` verbatim, so a relative one arrives as-is. Handing it to
 * `Deno.readTextFile` / `Deno.writeTextFile` resolves it against the RUNNER's
 * cwd — this repository — which is how a sandboxed `plan` run wrote a task file
 * into the real tree on 2026-08-13.
 */
export function resolveSessionPath(
  sessionCwd: string | undefined,
  path: string,
): string {
  if (isAbsolute(path)) return normalize(path);
  if (!sessionCwd) {
    throw new Error(
      `client fs: relative path ${path} with no session cwd to anchor it to`,
    );
  }
  return join(resolve(sessionCwd), path);
}

/**
 * Same anchoring, plus the containment a write needs: the agent under test may
 * only write inside its own sandbox. Anything else is a bench defect, and it
 * fails loudly rather than reaching the developer's working tree.
 */
export function confineWritePath(
  sessionCwd: string | undefined,
  path: string,
): string {
  if (!sessionCwd) {
    throw new Error(
      `client fs: refusing to write ${path} — outside the sandbox (none established yet)`,
    );
  }
  const resolved = resolveSessionPath(sessionCwd, path);
  const root = resolve(sessionCwd);
  if (resolved !== root && !resolved.startsWith(`${root}/`)) {
    throw new Error(
      `client fs: refusing to write ${resolved} — outside the sandbox ${root}`,
    );
  }
  return resolved;
}

/**
 * A tool invocation observed during the run, captured deterministically from
 * ACP `tool_call` / `tool_call_update` notifications (and synthesised for
 * client-side `fs/read_text_file` requests). Consumed by the runner to decide
 * skill-invocation checklist items WITHOUT asking the LLM judge.
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
   *
   * Without either the trace showed inputs only, and a judge asked whether a
   * block quoted verbatim in a file matches what a subagent returned had no
   * way to answer.
   */
  resultText?: string;
}

/**
 * Narrows a tool call's `rawInput` to the record the deterministic detector
 * reads. The SDK types it loosely (`unknown` on `tool_call`, `{}` on the
 * update) because ACP puts no shape on it, so the narrowing belongs here rather
 * than at each of the two call sites.
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

/**
 * Passes every incoming ACP message to `observe` before the client library
 * parses it, then forwards it untouched.
 *
 * The library validates each notification against its schema and answers a
 * mismatch with `-32602 Invalid params`, dropping the notification instead of
 * delivering it. claude-code-acp closes a subagent dispatch with the answer in
 * `rawOutput` as a bare STRING, which is exactly such a mismatch, so the
 * client's handler never saw a dispatch's return value: the only text captured
 * for the call was the prompt echoed by the OPENING notification. The trace then
 * read `-> returned: <the prompt>`, and on 2026-08-13 a judge concluded from it
 * both that the scout had returned nothing and that the report quoted in the
 * task file was fabricated — on a run whose raw session holds the real report.
 *
 * Observation never throws into the transport: a failure here would cost the
 * whole run, and what it protects is a trace detail.
 */
export function tapIncoming(
  stream: Stream,
  observe: (message: unknown) => void,
): Stream {
  const readable = stream.readable.pipeThrough(
    new TransformStream<AnyMessage, AnyMessage>({
      transform(chunk, controller) {
        try {
          observe(chunk);
        } catch { /* a trace detail must never break the transport */ }
        controller.enqueue(chunk);
      },
    }),
  );
  return { writable: stream.writable, readable };
}

export interface AcpClientOptions {
  /** Bidirectional ACP stream (typically `ndJsonStream(child.stdin, child.stdout)`). */
  stream: Stream;
  /**
   * Resolves when the underlying child process exits. Used to map a mid-turn
   * connection drop to a failure verdict instead of hanging on a request that
   * will never be answered.
   */
  closed?: Promise<unknown>;
}

export class AcpClient {
  readonly #conn: ClientSideConnection;
  readonly #closed?: Promise<unknown>;
  /** Per-session accumulated assistant text. */
  readonly #buffers = new Map<string, string[]>();
  /** Tool calls observed this run, keyed by toolCallId (ordered by Map). */
  readonly #toolCalls = new Map<string, CapturedToolCall>();
  /** Sandbox root of the current session; anchors every client-side fs path. */
  #sessionCwd?: string;

  constructor(opts: AcpClientOptions) {
    this.#closed = opts.closed;

    const client: Client = {
      sessionUpdate: (p) => this.#onSessionUpdate(p),
      requestPermission: (p) => this.#onRequestPermission(p),
      // NOTE: client-side fs reads are deliberately NOT captured as tool calls.
      // They include reads delegated by EXPLORE subagents during project
      // mapping (e.g. listing `.claude/skills/*/SKILL.md`), which are not the
      // main agent's skill-invocation decision and caused false positives on
      // `skill_not_invoked` scenarios. Invocation is detected from main-session
      // `tool_call` notifications only (the `Skill` tool call).
      readTextFile: (p) =>
        Deno.readTextFile(resolveSessionPath(this.#sessionCwd, p.path))
          .then((content) => ({ content })),
      writeTextFile: (p) =>
        Deno.writeTextFile(
          confineWritePath(this.#sessionCwd, p.path),
          p.content,
        ).then(() => ({})),
    };
    this.#conn = new ClientSideConnection(
      () => client,
      tapIncoming(opts.stream, (m) => this.#observeRawMessage(m)),
    );
  }

  /**
   * Records tool-call detail straight off the wire, so a notification the
   * library refuses still reaches the trace. Merges rather than replaces: the
   * validated handler runs right after this one for every message that does
   * pass, and neither may erase what the other established.
   */
  #observeRawMessage(message: unknown): void {
    const m = message as {
      method?: string;
      params?: { update?: Record<string, unknown> };
    };
    if (m?.method !== "session/update") return;
    const u = m.params?.update;
    const kind = u?.sessionUpdate;
    if (kind !== "tool_call" && kind !== "tool_call_update") return;
    const id = u?.toolCallId;
    if (typeof id !== "string" || id.length === 0) return;

    const prev = this.#toolCalls.get(id) ?? { toolCallId: id, title: "" };
    const result = flattenRawOutput(u?.rawOutput) ??
      flattenToolCallContent(u?.content);
    this.#toolCalls.set(id, {
      ...prev,
      title: typeof u?.title === "string" ? u.title : prev.title,
      kind: typeof u?.kind === "string" ? u.kind : prev.kind,
      rawInput: (u?.rawInput as Record<string, unknown> | undefined) ??
        prev.rawInput,
      // A closing notification's own result wins over the prompt the opening
      // one carried; absent a result, whatever was already captured stands.
      resultText: kind === "tool_call_update"
        ? result ?? prev.resultText
        : prev.resultText ?? result,
    });
  }

  /** All tool calls observed so far across every prompt turn this run. */
  getToolCalls(): CapturedToolCall[] {
    return [...this.#toolCalls.values()];
  }

  /**
   * Assistant text accumulated for a turn that has not returned yet.
   *
   * `prompt()` only hands the text back when the turn completes, so a run the
   * global timeout kills leaves everything the agent said unreachable. This
   * reads the same buffer while the turn is still in flight.
   */
  getBufferedText(sessionId: string): string {
    return (this.#buffers.get(sessionId) ?? []).join("");
  }

  /** Convenience: build a client over a spawned child's stdio. */
  static fromChild(
    child: {
      stdin: WritableStream<Uint8Array>;
      stdout: ReadableStream<Uint8Array>;
      status: Promise<unknown>;
    },
  ): AcpClient {
    return new AcpClient({
      stream: ndJsonStream(child.stdin, child.stdout),
      closed: child.status,
    });
  }

  initialize(): Promise<InitializeResponse> {
    return this.#conn.initialize({
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
    });
  }

  async newSession(cwd: string): Promise<string> {
    this.#sessionCwd = resolve(cwd);
    const resp = await this.#conn.newSession({ cwd, mcpServers: [] });
    return resp.sessionId;
  }

  /**
   * Runs one prompt turn and maps every failure to a deterministic verdict.
   * Never rejects — a connection drop, malformed frame, agent error, or
   * watchdog kill all return `subtype:"error"` (the judge's `exit_code_zero`
   * failure path), matching today's watchdog-trip semantics.
   */
  async prompt(sessionId: string, text: string): Promise<ParsedAgentOutput> {
    this.#buffers.set(sessionId, []);
    let dropped = false;
    const dropGuard = this.#closed?.then(() => {
      dropped = true;
      throw new Error("acp connection closed before turn completion");
    });
    try {
      const turn = this.#conn.prompt({
        sessionId,
        prompt: [{ type: "text", text }],
      });
      const resp = dropGuard
        ? await Promise.race([turn, dropGuard]) as PromptResponse
        : await turn;
      const assistantText = (this.#buffers.get(sessionId) ?? []).join("") ||
        null;
      return {
        sessionId,
        result: assistantText,
        subtype: resp.stopReason === "end_turn" ? "success" : resp.stopReason,
        assistantText,
        raw: { stopReason: resp.stopReason },
      };
    } catch (e) {
      return this.#failureVerdict(sessionId, dropped ? "connection_drop" : e);
    }
  }

  #failureVerdict(sessionId: string, cause: unknown): ParsedAgentOutput {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return {
      sessionId,
      result: null,
      subtype: "error",
      assistantText: null,
      raw: { acpError: reason },
    };
  }

  #onSessionUpdate(params: SessionNotification): Promise<void> {
    const u = params.update;
    if (
      (u.sessionUpdate === "agent_message_chunk" ||
        u.sessionUpdate === "agent_thought_chunk") &&
      u.content.type === "text"
    ) {
      const buf = this.#buffers.get(params.sessionId);
      if (buf) buf.push(u.content.text);
    } else if (u.sessionUpdate === "tool_call") {
      this.#toolCalls.set(u.toolCallId, {
        toolCallId: u.toolCallId,
        title: u.title,
        kind: u.kind ?? undefined,
        rawInput: asRecord(u.rawInput),
        locations: u.locations?.map((l) => ({ path: l.path })),
        resultText: flattenRawOutput(u.rawOutput) ??
          flattenToolCallContent(u.content),
      });
    } else if (u.sessionUpdate === "tool_call_update") {
      // Merge later detail (rawInput/locations often arrive on the update) into
      // the existing entry so the deterministic detector sees the full input.
      const prev = this.#toolCalls.get(u.toolCallId) ??
        { toolCallId: u.toolCallId, title: "" };
      this.#toolCalls.set(u.toolCallId, {
        ...prev,
        title: u.title ?? prev.title,
        kind: u.kind ?? prev.kind,
        rawInput: asRecord(u.rawInput) ?? prev.rawInput,
        locations: u.locations?.map((l) => ({ path: l.path })) ??
          prev.locations,
        resultText: flattenRawOutput(u.rawOutput) ??
          flattenToolCallContent(u.content) ?? prev.resultText,
      });
    }
    return Promise.resolve();
  }

  /**
   * Auto-allow every tool — the `bypassPermissions` equivalent. Mocking is done
   * by PATH-shadowing (`mock_bin.ts`), not by denying here, so the model always
   * sees a real tool result (canned for mocked tools).
   */
  #onRequestPermission(
    params: RequestPermissionRequest,
  ): Promise<RequestPermissionResponse> {
    const allow = params.options.find(
      (o) => o.kind === "allow_once" || o.kind === "allow_always",
    ) ?? params.options[0];
    return Promise.resolve({
      outcome: { outcome: "selected", optionId: allow.optionId },
    });
  }
}
