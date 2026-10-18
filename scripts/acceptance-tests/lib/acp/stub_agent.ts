/**
 * Local ACP stub agent (FR-ACCEPT.ACP) — a faithful, deterministic, LLM-free
 * agent that speaks just enough of the Agent Client Protocol to drive
 * `AcpAgent` and judge tests offline. Run as a child process over stdio:
 *
 *   deno run -A scripts/acceptance-tests/lib/acp/stub_agent.ts
 *
 * It is NOT a mock of our own code — it is a real ACP server (the agent side of
 * the official library) whose behaviour is scripted by markers in the prompt
 * text, kept faithful to the real agents' message shapes:
 *
 *   [[CRASH]]        → exit(1) mid-turn before answering session/prompt
 *                      (simulates a connection drop for the error-mapping test).
 *   [[TOOL:<cmd>]]   → report a tool call for Bash `<cmd>`, request permission,
 *                      and ONLY if granted actually run it (writes a sentinel
 *                      file `tool-ran.txt` in the session cwd). If the client
 *                      denies (mock interception), the real command never runs.
 *   [[DISPATCH]]     → report a subagent dispatch the way claude-code-acp does:
 *                      the opening notification carries the prompt, the closing
 *                      one the answer in `rawOutput` as a bare STRING — a shape
 *                      the client library's schema refuses outright.
 *   [[THINK]]        → stream an `agent_thought_chunk` reasoning headline and
 *                      then the reply as an `agent_message_chunk`, the way codex
 *                      does: two separate notifications, neither carrying a
 *                      trailing separator, so a client that appends both to one
 *                      buffer hands the reader `<headline><reply>` glued.
 *   [[SEQUENCE]]     → stream a reasoning headline, a reply sentence, one
 *                      tool call (opened and closed), then a second reply
 *                      sentence — the order a judge must be able to read back:
 *                      which command ran before which sentence.
 *   [[REPLY]]x[[/REPLY]] → stream `x` verbatim, split over two chunks, and
 *                      return `STUB_USAGE` on the PromptResponse — the shape
 *                      the claude bridge answers a judge turn with.
 *   [[META]]         → reply with a JSON object describing what the stub saw:
 *                      the session's `_meta`, how many sessions are open, the
 *                      session id, `ANTHROPIC_MODEL`, `HOME` and the stub's pid.
 *   [[WRITE:<path>]] → ask the CLIENT to write `<path>` (`fs/write_text_file`)
 *                      and reply `wrote` or `refused: <error>` — the client-fs
 *                      confinement a sandboxed run depends on.
 *   [[STALL]]        → stream a reply chunk, reasoning and one tool call, then
 *                      never answer the prompt — the turn a global timeout
 *                      cuts short.
 *   [[LATE_NOTICE]]  → the claude bridge's race: end the turn while a finished
 *                      background task's notice is still queued in the
 *                      session transcript, then answer that notice on the
 *                      model's own, out of turn, a moment later.
 *   anything else    → stream an `agent_message_chunk` echoing a fixed reply.
 *
 * The sentinel write is the observable "real tool executed" side-effect the
 * mock-interception test asserts is absent.
 */
import {
  type Agent,
  AgentSideConnection,
  type CancelNotification,
  type CloseSessionRequest,
  type CloseSessionResponse,
  type InitializeRequest,
  type InitializeResponse,
  ndJsonStream,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  PROTOCOL_VERSION,
} from "@agentclientprotocol/sdk";
import { join } from "@std/path";

const TOOL_MARKER = /\[\[TOOL:([^\]]*)\]\]/;
const DISPATCH_MARKER = /\[\[DISPATCH\]\]/;
const THINK_MARKER = /\[\[THINK\]\]/;
const SEQUENCE_MARKER = /\[\[SEQUENCE\]\]/;
const REPLY_MARKER = /\[\[REPLY\]\]([\s\S]*?)\[\[\/REPLY\]\]/;
const META_MARKER = /\[\[META\]\]/;
const WRITE_MARKER = /\[\[WRITE:([^\]]*)\]\]/;
const STALL_MARKER = /\[\[STALL\]\]/;
const LATE_NOTICE_MARKER = /\[\[LATE_NOTICE\]\]/;

/** What a `[[LATE_NOTICE]]` turn says before it ends, and after. */
export const LATE_WAITING = "Four of five agents have reported.";
export const LATE_REPORT = "## Maintenance report: all five scans done";
/** How long the stub's "model" takes to pick the queued notice up, ms. */
const LATE_DELAY_MS = 1000;

/** What a `[[STALL]]` turn streams before it hangs. */
export const STALL_REPLY = "Starting the review.";
export const STALL_REASONING = "Reading the diff";
export const STALL_COMMAND = "git status";

/** What a `[[REPLY]]` turn reports as its usage (disjoint fields, like the
 * claude bridge's). */
export const STUB_USAGE = {
  inputTokens: 100,
  outputTokens: 20,
  cachedReadTokens: 30,
  cachedWriteTokens: 5,
  totalTokens: 155,
};

/** What the `[[SEQUENCE]]` marker streams, in this order. */
export const SEQUENCE_REASONING = "Checking report scope";
export const SEQUENCE_BEFORE = "The checks passed.";
export const SEQUENCE_COMMAND = "git diff --stat";
export const SEQUENCE_AFTER = "## Review: Approve";

/** The reasoning headline and the reply the `[[THINK]]` marker streams. */
export const THINK_REASONING = "Confirming absence of SRS and SDS documents";
export const THINK_REPLY =
  "Выгрузку нельзя включить, пока не выполнены две проверки.";

/** What the scripted subagent dispatch sends down, and what it answers with. */
export const DISPATCH_PROMPT = "Bug report: titles are cut mid-word.";
export const DISPATCH_REPORT = "## Surface\n- src/report/pdf_export.ts:3";

class StubAgent implements Agent {
  #conn: AgentSideConnection;
  #cwd = "";
  #counter = 0;
  #meta = new Map<string, unknown>();
  #open = new Set<string>();

  constructor(conn: AgentSideConnection) {
    this.#conn = conn;
  }

  initialize(_params: InitializeRequest): Promise<InitializeResponse> {
    return Promise.resolve({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: true,
        sessionCapabilities: { close: {} },
      },
      authMethods: [],
    });
  }

  /** No auth: `initialize` advertises no methods, so nothing ever calls this. */
  authenticate(): Promise<void> {
    return Promise.resolve();
  }

  newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    this.#cwd = params.cwd;
    const sessionId = `stub-session-${++this.#counter}`;
    this.#meta.set(sessionId, params._meta ?? null);
    this.#open.add(sessionId);
    return Promise.resolve({ sessionId });
  }

  closeSession(params: CloseSessionRequest): Promise<CloseSessionResponse> {
    this.#open.delete(params.sessionId);
    this.#meta.delete(params.sessionId);
    return Promise.resolve({});
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    const text = params.prompt
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    if (text.includes("[[CRASH]]")) {
      // Simulate a mid-turn connection drop: die before responding.
      Deno.exit(1);
    }

    const write = text.match(WRITE_MARKER);
    if (write) {
      try {
        await this.#conn.writeTextFile({
          sessionId: params.sessionId,
          path: write[1],
          content: "stub",
        });
        await this.#emit(params.sessionId, "wrote");
      } catch (e) {
        const msg = (e as { message?: string })?.message ?? String(e);
        await this.#emit(params.sessionId, `refused: ${msg}`);
      }
      return { stopReason: "end_turn" };
    }

    if (STALL_MARKER.test(text)) {
      await this.#emit(params.sessionId, STALL_REPLY);
      await this.#emitThought(params.sessionId, STALL_REASONING);
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId: `stall-${++this.#counter}`,
          title: STALL_COMMAND,
          kind: "execute",
          status: "pending",
          rawInput: { command: STALL_COMMAND },
        },
      });
      return await new Promise<PromptResponse>(() => {});
    }

    if (LATE_NOTICE_MARKER.test(text)) {
      // The transcript lines claude writes, in its order (sweep run
      // 2026-10-18T14-45-21, maintenance-detects-doc-health-issues): the
      // notice is queued before the turn settles, and dequeued, answered and
      // closed only after.
      const sid = params.sessionId;
      const notice = "<task-notification>\n<task-id>a1</task-id>";
      await this.#appendTranscript(sid, {
        type: "queue-operation",
        operation: "enqueue",
        content: notice,
      });
      await this.#emit(sid, LATE_WAITING);
      setTimeout(async () => {
        await this.#appendTranscript(
          sid,
          { type: "queue-operation", operation: "dequeue" },
          {
            type: "user",
            origin: { kind: "task-notification" },
            message: { role: "user", content: notice },
          },
        );
        await this.#emit(sid, LATE_REPORT);
        await this.#appendTranscript(sid, {
          type: "assistant",
          message: {
            stop_reason: "end_turn",
            content: [{ type: "text", text: LATE_REPORT }],
          },
        });
      }, LATE_DELAY_MS);
      return { stopReason: "end_turn" };
    }

    const reply = text.match(REPLY_MARKER);
    if (reply) {
      const half = Math.floor(reply[1].length / 2);
      await this.#emit(params.sessionId, reply[1].slice(0, half));
      await this.#emit(params.sessionId, reply[1].slice(half));
      return { stopReason: "end_turn", usage: STUB_USAGE };
    }

    if (META_MARKER.test(text)) {
      await this.#emit(
        params.sessionId,
        JSON.stringify({
          meta: this.#meta.get(params.sessionId) ?? null,
          open: this.#open.size,
          sessionId: params.sessionId,
          model: Deno.env.get("ANTHROPIC_MODEL") ?? null,
          home: Deno.env.get("HOME") ?? null,
          pid: Deno.pid,
        }),
      );
      return { stopReason: "end_turn" };
    }

    if (DISPATCH_MARKER.test(text)) {
      const toolCallId = `dispatch-${++this.#counter}`;
      // Shape copied from claude-code-acp: the opening notification carries the
      // dispatch INPUT (the prompt), and the closing one carries the subagent's
      // answer in `rawOutput` as a bare STRING. That string fails the client
      // library's schema, so the whole closing notification is refused with
      // -32602 and never reaches the client's handler — leaving the prompt as
      // the only text ever captured for this call.
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId,
          title: "Task",
          kind: "think",
          status: "pending",
          rawInput: { subagent_type: "surface-scout", prompt: DISPATCH_PROMPT },
          content: [{
            type: "content",
            content: { type: "text", text: DISPATCH_PROMPT },
          }],
        },
      });
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId,
          status: "completed",
          rawOutput: DISPATCH_REPORT as unknown as Record<string, unknown>,
        },
      });
      await this.#emit(params.sessionId, "dispatched");
      return { stopReason: "end_turn" };
    }

    const toolMatch = text.match(TOOL_MARKER);
    if (toolMatch) {
      const command = toolMatch[1];
      const toolCallId = `call-${++this.#counter}`;
      // Report the tool call, then ask permission before running it.
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId,
          title: command,
          kind: "execute",
          status: "pending",
          rawInput: { command },
        },
      });
      const perm = await this.#conn.requestPermission({
        sessionId: params.sessionId,
        toolCall: { toolCallId, rawInput: { command } },
        options: [
          { optionId: "allow", name: "Allow", kind: "allow_once" },
          { optionId: "reject", name: "Reject", kind: "reject_once" },
        ],
      });
      const granted = perm.outcome.outcome === "selected" &&
        perm.outcome.optionId === "allow";
      if (granted) {
        // Real tool executes: drop a sentinel the test can observe.
        await Deno.writeTextFile(join(this.#cwd, "tool-ran.txt"), command);
        await this.#emit(params.sessionId, `ran: ${command}`);
      } else {
        await this.#emit(params.sessionId, `blocked: ${command}`);
      }
      return { stopReason: "end_turn" };
    }

    if (SEQUENCE_MARKER.test(text)) {
      const toolCallId = `seq-${++this.#counter}`;
      await this.#emitThought(params.sessionId, SEQUENCE_REASONING);
      await this.#emit(params.sessionId, SEQUENCE_BEFORE);
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId,
          title: SEQUENCE_COMMAND,
          kind: "execute",
          status: "pending",
          rawInput: { command: SEQUENCE_COMMAND },
        },
      });
      await this.#conn.sessionUpdate({
        sessionId: params.sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId,
          status: "completed",
        },
      });
      await this.#emit(params.sessionId, SEQUENCE_AFTER);
      return { stopReason: "end_turn" };
    }

    if (THINK_MARKER.test(text)) {
      await this.#emitThought(params.sessionId, THINK_REASONING);
      await this.#emit(params.sessionId, THINK_REPLY);
      return { stopReason: "end_turn" };
    }

    await this.#emit(params.sessionId, `echo: ${text}`);
    return { stopReason: "end_turn" };
  }

  cancel(_params: CancelNotification): Promise<void> {
    return Promise.resolve();
  }

  #emit(sessionId: string, text: string): Promise<void> {
    return this.#conn.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      },
    });
  }

  /** Appends lines to the session transcript where claude keeps it. */
  async #appendTranscript(
    sessionId: string,
    ...entries: Record<string, unknown>[]
  ): Promise<void> {
    const slug = this.#cwd.replace(/[^A-Za-z0-9]/g, "-");
    const configDir = Deno.env.get("CLAUDE_CONFIG_DIR") ??
      join(Deno.env.get("HOME") ?? "", ".claude");
    const dir = join(configDir, "projects", slug);
    await Deno.mkdir(dir, { recursive: true });
    const lines = entries.map((e) => JSON.stringify({ ...e, sessionId }));
    await Deno.writeTextFile(
      join(dir, `${sessionId}.jsonl`),
      lines.join("\n") + "\n",
      { append: true },
    );
  }

  #emitThought(sessionId: string, text: string): Promise<void> {
    return this.#conn.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text },
      },
    });
  }
}

if (import.meta.main) {
  const stream = ndJsonStream(Deno.stdout.writable, Deno.stdin.readable);
  new AgentSideConnection((conn) => new StubAgent(conn), stream);
  // Keep the process alive while the connection reads stdin.
  await new Promise(() => {});
}
