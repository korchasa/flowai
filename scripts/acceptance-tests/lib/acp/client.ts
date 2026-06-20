/**
 * ACP transport client (FR-ACCEPT.ACP).
 *
 * Wraps the official `@zed-industries/agent-client-protocol` client over a
 * child's stdio (the child is spawned + guarded by `SpawnedAgent`, preserving
 * FR-ACCEPT-GUARDS). Drives one prompt turn end-to-end —
 * `initialize → session/new → session/prompt` — accumulating assistant text and
 * tool-call reports into the existing `ParsedAgentOutput` shape so the judge,
 * tracer and `UserEmulator` consume an unchanged structure.
 *
 * Mocking (replaces the per-IDE `setupMocks` hooks): the client interceptor
 * implements BOTH gating paths the agents differ on — (a) `session/request_permission`
 * (deny a matched tool so the real command never runs) and (b) the auto-run
 * tool-result boundary (substitute the canned reason). One implementation for
 * all IDEs via `mock_matcher.ts`.
 *
 * Error mapping (callback→Promise): connection drop / malformed frame / agent
 * error response / watchdog kill each resolve to a deterministic
 * `exit_code_zero`-style failure verdict (`subtype:"error"`) handed to the judge
 * — never an unhandled rejection. See `runTurn`.
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
} from "@zed-industries/agent-client-protocol";
import type { ParsedAgentOutput } from "../adapters/types.ts";
import { resolveMock } from "./mock_matcher.ts";

export interface AcpClientOptions {
  /** Bidirectional ACP stream (typically `ndJsonStream(child.stdin, child.stdout)`). */
  stream: Stream;
  /** Static one-response-per-tool mocks: `{ toolName: cannedReason }`. */
  mocks?: Record<string, string>;
  /**
   * Resolves when the underlying child process exits. Used to map a mid-turn
   * connection drop to a failure verdict instead of hanging on a request that
   * will never be answered.
   */
  closed?: Promise<unknown>;
}

/** A mock the interceptor substituted during a turn (for trace/diagnostics). */
export interface InterceptedMock {
  tool: string;
  reason: string;
  command: string;
}

/** Command text carried by a tool call's raw input, across IDE field names. */
function extractCommand(rawInput: Record<string, unknown> | undefined): string {
  if (!rawInput) return "";
  for (const key of ["command", "cmd", "script"]) {
    const v = rawInput[key];
    if (typeof v === "string") return v;
  }
  return "";
}

export class AcpClient {
  readonly #conn: ClientSideConnection;
  readonly #mocks: Record<string, string>;
  readonly #closed?: Promise<unknown>;
  /** Per-session accumulated assistant text. */
  readonly #buffers = new Map<string, string[]>();
  readonly intercepted: InterceptedMock[] = [];

  constructor(opts: AcpClientOptions) {
    this.#mocks = opts.mocks ?? {};
    this.#closed = opts.closed;

    const client: Client = {
      sessionUpdate: (p) => this.#onSessionUpdate(p),
      requestPermission: (p) => this.#onRequestPermission(p),
      readTextFile: (p) =>
        Deno.readTextFile(p.path).then((content) => ({ content })),
      writeTextFile: (p) =>
        Deno.writeTextFile(p.path, p.content).then(() => ({})),
    };
    this.#conn = new ClientSideConnection(() => client, opts.stream);
  }

  /** Convenience: build a client over a spawned child's stdio. */
  static fromChild(
    child: {
      stdin: WritableStream<Uint8Array>;
      stdout: ReadableStream<Uint8Array>;
      status: Promise<unknown>;
    },
    mocks?: Record<string, string>,
  ): AcpClient {
    return new AcpClient({
      stream: ndJsonStream(child.stdin, child.stdout),
      mocks,
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
    }
    return Promise.resolve();
  }

  /**
   * Path (a): an agent asks before running a tool. If the tool matches a mock,
   * reject the permission (real tool never runs) and record the canned reason
   * for substitution. Otherwise allow.
   */
  #onRequestPermission(
    params: RequestPermissionRequest,
  ): Promise<RequestPermissionResponse> {
    const command = extractCommand(params.toolCall.rawInput);
    const hit = command ? resolveMock(command, this.#mocks) : null;

    if (hit) {
      this.intercepted.push({ ...hit, command });
      // Inject the canned reason as the tool's "output" the model will read.
      const buf = this.#buffers.get(params.sessionId);
      if (buf) buf.push(hit.reason);
      const reject = params.options.find(
        (o) => o.kind === "reject_once" || o.kind === "reject_always",
      );
      if (reject) {
        return Promise.resolve({
          outcome: { outcome: "selected", optionId: reject.optionId },
        });
      }
      return Promise.resolve({ outcome: { outcome: "cancelled" } });
    }

    const allow = params.options.find(
      (o) => o.kind === "allow_once" || o.kind === "allow_always",
    ) ?? params.options[0];
    return Promise.resolve({
      outcome: { outcome: "selected", optionId: allow.optionId },
    });
  }
}
