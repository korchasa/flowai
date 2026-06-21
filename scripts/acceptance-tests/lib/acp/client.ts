/**
 * ACP transport client (FR-ACCEPT.ACP).
 *
 * Wraps the official `@zed-industries/agent-client-protocol` client over a
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
} from "@zed-industries/agent-client-protocol";
import type { ParsedAgentOutput } from "../adapters/types.ts";

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

  constructor(opts: AcpClientOptions) {
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
