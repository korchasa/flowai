/**
 * Local ACP stub agent (FR-ACCEPT.ACP) — a faithful, deterministic, LLM-free
 * agent that speaks just enough of the Agent Client Protocol to drive
 * `AcpClient` tests offline. Run as a child process over stdio:
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
 *   anything else    → stream an `agent_message_chunk` echoing a fixed reply.
 *
 * The sentinel write is the observable "real tool executed" side-effect the
 * mock-interception test asserts is absent.
 */
import {
  type Agent,
  AgentSideConnection,
  type CancelNotification,
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

  constructor(conn: AgentSideConnection) {
    this.#conn = conn;
  }

  initialize(_params: InitializeRequest): Promise<InitializeResponse> {
    return Promise.resolve({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: { loadSession: true },
      authMethods: [],
    });
  }

  /** No auth: `initialize` advertises no methods, so nothing ever calls this. */
  authenticate(): Promise<void> {
    return Promise.resolve();
  }

  newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    this.#cwd = params.cwd;
    return Promise.resolve({ sessionId: `stub-session-${++this.#counter}` });
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    const text = params.prompt
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    if (text.includes("[[CRASH]]")) {
      // Simulate a mid-turn connection drop: die before responding.
      Deno.exit(1);
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
