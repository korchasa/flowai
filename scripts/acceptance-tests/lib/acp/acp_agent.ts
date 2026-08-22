/**
 * ACP agent executor (FR-ACCEPT.ACP) — the sole transport-side agent runner.
 * Spawns an IDE's ACP server from the data-only registry, preserving
 * FR-ACCEPT-GUARDS (setpgrp process group + watchdog + health gate), and drives
 * the conversation over the official ACP client:
 *
 *   spawn(registry.launch) under setpgrp_exec.py
 *     → AcpClient over the child's stdio
 *     → initialize → session/new → session/prompt (turn 1)
 *     → [UserEmulator] session/prompt on the SAME session (multi-turn — ACP
 *        keeps the session across turns)
 *     → accumulate a readable transcript for the judge.
 *
 * Tool mocking is IDE-agnostic via PATH-shadowing (`writeMockBin`): the client
 * auto-allows every permission request, and mocked commands resolve to stub
 * executables that print the canned result. Errors map to a non-zero exit code
 * via the client's deterministic failure verdict (FR-ACCEPT.ACP error mapping).
 */
import { dirname, fromFileUrl, join } from "@std/path";
import { ndJsonStream } from "@agentclientprotocol/sdk";
import { startWatchdog, type WatchdogHandle } from "../process_watchdog.ts";
import {
  assertHealthy,
  describeHealth,
  SystemUnhealthyError,
} from "../system_health.ts";
import { AcpClient, type CapturedToolCall } from "./client.ts";
import { writeMockBin } from "./mock_bin.ts";
import { ACP_AGENTS, type AcpAgentSpec, type AcpIde } from "./registry.ts";

const SETPGRP_WRAPPER = fromFileUrl(
  new URL("../setpgrp_exec.py", import.meta.url),
);

export interface AcpAgentOptions {
  ide: AcpIde;
  workspace: string;
  model: string;
  prompt: string;
  /** Extra env (e.g. isolated HOME from prepareAcpClaudeHome). */
  env?: Record<string, string>;
  /** Static one-response-per-tool mocks. */
  mocks?: Record<string, string>;
  /** Max conversation turns (UserEmulator). Defaults to 10. */
  maxSteps?: number;
  name?: string;
  /** Test-only: skip the setpgrp wrapper + watchdog. */
  disableWatchdog?: boolean;
}

export interface AcpAgentResult {
  code: number;
  logs: string;
}

interface Message {
  role: string;
  content: string;
}

/**
 * Pick the tool-call list to score: the run's own snapshot when it exists,
 * otherwise whatever the client has captured so far.
 *
 * Split out to be testable. The snapshot wins because it is taken after the
 * session closes; the live list only ever matters for a run that was killed
 * before it could take one.
 */
export function resolveToolCalls(
  snapshot: CapturedToolCall[],
  live: CapturedToolCall[] | undefined,
): CapturedToolCall[] {
  if (snapshot.length > 0) return snapshot;
  return live ?? [];
}

/** Executes one IDE agent over ACP for the full (multi-turn) scenario. */
export class AcpAgent {
  #child: Deno.ChildProcess | null = null;
  #watchdog: WatchdogHandle | null = null;
  #sessionId: string | null = null;
  #messages: Message[] = [];
  #log: string[] = [];
  #toolCalls: CapturedToolCall[] = [];
  #client:
    | {
      getToolCalls(): CapturedToolCall[];
      getBufferedText(sessionId: string): string;
    }
    | null = null;
  readonly #spec: AcpAgentSpec;

  constructor(private opts: AcpAgentOptions) {
    this.#spec = ACP_AGENTS[opts.ide];
  }

  getSessionId(): string | null {
    return this.#sessionId;
  }

  getMessages(): Message[] {
    return this.#messages;
  }

  /**
   * Tool calls observed this run — used for deterministic checklist items.
   *
   * Falls back to the live client while a run is still in flight. `run()`
   * snapshots the calls in its `finally`, which never executes when a caller
   * kills the agent on a wall-clock timeout — so every timed-out scenario used
   * to score "0 tool call(s) observed" no matter what the agent had done.
   * `deep-research-trigger-pos-1` carried that verdict across two sweeps and
   * five months of cap-raising, and it was read as "the agent never started".
   */
  getToolCalls(): CapturedToolCall[] {
    return resolveToolCalls(this.#toolCalls, this.#client?.getToolCalls());
  }

  /**
   * The transcript so far, readable while the run is still in flight.
   *
   * `run()` returns its log only when it finishes, so a caller that kills the
   * agent on a wall-clock timeout otherwise loses the entire transcript of the
   * session it most needs to read.
   */
  getPartialLog(): string {
    return this.#log.join("");
  }

  /** Drives the agent to completion; never throws — failures become a code. */
  async run(
    userEmulator?: {
      getResponse: (messages: Message[]) => Promise<string | null>;
    },
  ): Promise<AcpAgentResult> {
    // Pre-flight health gate (FR-ACCEPT-GUARDS), no env-var bypass.
    try {
      const h = await assertHealthy(
        undefined,
        `acp ${this.opts.name ?? ""}`.trim(),
      );
      if (h.platform === "darwin") {
        this.#log.push(`[health] ${describeHealth(h)}\n`);
      }
    } catch (e) {
      if (e instanceof SystemUnhealthyError) {
        this.#log.push(`\n[health] aborting spawn: ${e.message}\n`);
        return { code: 75, logs: this.#log.join("") };
      }
      throw e;
    }

    const wrap = !this.opts.disableWatchdog;
    const command = wrap ? "python3" : this.#spec.launch.command;
    const args = wrap
      ? [SETPGRP_WRAPPER, this.#spec.launch.command, ...this.#spec.launch.args]
      : [...this.#spec.launch.args];

    const env: Record<string, string> = {
      ...this.#spec.launch.env,
      // Many Claude tools honour ANTHROPIC_MODEL; harmless if ignored.
      ANTHROPIC_MODEL: this.opts.model,
      ...this.opts.env,
    };

    // Tool mocking (FR-ACCEPT.ACP): shadow mocked commands on PATH with stubs
    // that emit the canned output, so the model sees a real (canned) tool
    // result — ACP permission-deny cannot deliver that. Sibling of the sandbox.
    if (this.opts.mocks && Object.keys(this.opts.mocks).length > 0) {
      const mockBin = await writeMockBin(
        join(dirname(this.opts.workspace), "mockbin"),
        this.opts.mocks,
      );
      if (mockBin) {
        const parentPath = this.opts.env?.PATH ?? Deno.env.get("PATH") ?? "";
        env.PATH = `${mockBin}:${parentPath}`;
      }
    }

    let child: Deno.ChildProcess;
    try {
      child = new Deno.Command(command, {
        args,
        cwd: this.opts.workspace,
        env,
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      }).spawn();
    } catch (e) {
      this.#log.push(`Error starting ACP agent: ${e}\n`);
      return { code: 1, logs: this.#log.join("") };
    }
    this.#child = child;

    this.#watchdog = startWatchdog(child.pid, {
      disabled: this.opts.disableWatchdog,
      onTrip: (trip) => {
        const tag = trip.cause === "fork-loop"
          ? "[fork-loop guard]"
          : "[rss-bloat guard]";
        this.#log.push(`\n${tag} killed agent tree: ${trip.reason}\n`);
        console.error(`${tag} ${trip.reason}`);
      },
    });

    // Drain stderr (claude-code-acp logs there) for diagnostics.
    const stderrDone = this.#drainStderr(child.stderr);

    const client = new AcpClient({
      stream: ndJsonStream(child.stdin, child.stdout),
      closed: child.status,
    });
    this.#client = client;

    let code = 0;
    try {
      await client.initialize();
      this.#sessionId = await client.newSession(this.opts.workspace);

      const maxSteps = this.opts.maxSteps ?? 10;
      let nextPrompt: string | null = this.opts.prompt;
      for (let step = 0; step < maxSteps && nextPrompt; step++) {
        this.#messages.push({ role: "user", content: nextPrompt });
        this.#log.push(`\n[turn ${step + 1}] > ${nextPrompt}\n`);

        const out = await client.prompt(this.#sessionId, nextPrompt);
        const text = out.assistantText ?? out.result ?? "";
        this.#messages.push({ role: "assistant", content: text });
        this.#log.push(`< ${text}\n`);
        if (out.subtype === "error") {
          code = 1;
          this.#log.push(`[acp-error] ${JSON.stringify(out.raw)}\n`);
          break;
        }

        nextPrompt = null;
        if (userEmulator) {
          const input = await userEmulator.getResponse(this.#messages);
          if (input && input !== "WAIT") nextPrompt = input;
        }
      }
    } catch (e) {
      this.#log.push(`\n[acp-fatal] ${e}\n`);
      code = 1;
    } finally {
      // Snapshot tool calls before teardown so the runner can score
      // skill-invocation checklist items deterministically.
      this.#toolCalls = client.getToolCalls();
      if (this.#toolCalls.length > 0) {
        this.#log.push(
          `\n[tool-calls] ${
            this.#toolCalls
              .map((t) => describeToolCall(t))
              .join("\n             ")
          }\n`,
        );
      }
      this.#kill();
      await stderrDone.catch(() => {});
      await child.status.catch(() => {});
    }

    // A watchdog trip overrides the exit code with the canonical 137 (as the
    // direct path did) so the judge sees the kill.
    const trip = this.#watchdog?.trip();
    this.#watchdog?.stop();
    return { code: trip ? 137 : code, logs: this.#log.join("") };
  }

  /**
   * Everything captured so far, readable while `run()` is still in flight.
   *
   * The global-timeout path needs this: it rejects the race and kills the
   * process, so `run()` never returns its own logs. Without a partial read the
   * runner has nothing but a synthetic marker to score, and every timed-out
   * scenario reports "0 tool calls observed" no matter how much work it did —
   * which reads as "the agent did nothing" and is how a timeout gets
   * misdiagnosed as a routing failure.
   */
  get partialLogs(): string {
    const pending = this.#client && this.#sessionId
      ? this.#client.getBufferedText(this.#sessionId)
      : "";
    const calls = (this.#client?.getToolCalls() ?? []).map(describeToolCall);
    return composePartialTrace(this.#log.join(""), pending, calls);
  }

  /** Public termination for the runner's global-timeout path. */
  kill(): void {
    this.#kill();
    try {
      this.#watchdog?.stop();
    } catch { /* ignore */ }
  }

  async #drainStderr(stream: ReadableStream<Uint8Array>): Promise<void> {
    const dec = new TextDecoder();
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const t = dec.decode(value, { stream: true });
        if (t.trim()) this.#log.push(`[stderr] ${t}`);
      }
    } catch {
      /* ignore */
    } finally {
      reader.releaseLock();
    }
  }

  #kill(): void {
    if (!this.#child) return;
    const pid = this.#child.pid;
    try {
      Deno.kill(-pid, "SIGTERM");
    } catch { /* group gone */ }
    try {
      this.#child.kill("SIGTERM");
    } catch { /* leader gone */ }
  }
}

/**
 * Renders one captured tool call for the `[tool-calls]` trace block.
 *
 * ACP notifications carry a human `title` and a `kind` from a fixed enum
 * (read / edit / execute / think / …) — never the tool's NAME. The previous
 * `${title}(${kind})` form therefore read as if `kind` were the tool: a
 * subagent dispatch rendered as `Enumerate affected surface(think): {...}`,
 * and the LLM judge scoring `scout_subagent_dispatched` rejected it as "the
 * extended-thinking tool, not a Task/Agent invocation" — on a run where the
 * dispatch had in fact happened. The identical rendering was accepted in
 * another run, so the checklist item was decided by how the judge read an
 * ambiguous string.
 *
 * A dispatch is now named for what it is, taken from the one field that does
 * identify it (`rawInput.subagent_type`), and `kind` is labelled so it cannot
 * be mistaken for a tool name.
 *
 * On a dispatch the `kind` is dropped entirely. Labelling it did not stop the
 * misreading: in the 2026-08-12 sweep the judge rejected
 * `subagent dispatch -> surface-scout (via Task/Agent tool) [kind=think]` with
 * "tagged [kind=think], indicating an internal reasoning step, NOT an actual
 * tool invocation" — on a run whose raw session shows the `Task` call and the
 * subagent's own 81-line transcript. ACP reports `think` for every Task call,
 * so the field carries no information here and only invites that inference.
 */
/**
 * Trace for a turn that never returned.
 *
 * The turn loop pushes the assistant's text only after `client.prompt()`
 * resolves, and renders `[tool-calls]` only in its `finally`. A global timeout
 * abandons that promise, so neither runs and the flushed log holds just the
 * prompt header. Measured 2026-08-22 on `deep-research-plan`: the judge was
 * handed two stderr lines and a timeout marker, failed four items for "no
 * evidence", while the raw session carried the plan, the temp dir and two
 * dispatched research agents. This composes what the live client still holds
 * onto whatever the loop managed to flush.
 */
export function composePartialTrace(
  flushed: string,
  pendingAssistantText: string,
  toolCallLines: readonly string[],
): string {
  const parts = [flushed];
  if (pendingAssistantText.trim()) {
    parts.push(`< ${pendingAssistantText}\n`);
  }
  if (toolCallLines.length > 0 && !flushed.includes("[tool-calls]")) {
    parts.push(`\n[tool-calls] ${toolCallLines.join("\n             ")}\n`);
  }
  return parts.join("");
}

export function describeToolCall(t: CapturedToolCall): string {
  const sub = t.rawInput?.subagent_type;
  if (typeof sub === "string" && sub.length > 0) {
    return `subagent dispatch -> ${sub} (via Task/Agent tool): ${
      JSON.stringify(t.rawInput ?? {})
    }\n${indentBlock(describeDispatchResult(t.resultText))}`;
  }
  const kind = t.kind ? ` [kind=${t.kind}]` : "";
  return `${t.title}${kind}: ${JSON.stringify(t.rawInput ?? {})}`;
}

/** Cap on the dispatch result carried into the trace, in characters. */
const DISPATCH_RESULT_LIMIT = 4000;

/**
 * Renders what a dispatch RETURNED, so a judge can check a quotation against
 * its source. Only dispatches carry their result into the trace: every tool
 * call doing so would bury the trace under file contents, and the dispatch is
 * where the question "did the agent quote what came back, or write it itself?"
 * is actually asked.
 */
export function describeDispatchResult(resultText?: string): string {
  if (!resultText) {
    return "-> returned: (no result payload captured for this dispatch)";
  }
  const clipped = resultText.length > DISPATCH_RESULT_LIMIT
    ? `${resultText.slice(0, DISPATCH_RESULT_LIMIT)}\n… [truncated ${
      resultText.length - DISPATCH_RESULT_LIMIT
    } chars]`
    : resultText;
  return `-> returned:\n${clipped}`;
}

/** Indents a block so it reads as belonging to the line above it. */
function indentBlock(text: string): string {
  return text.split("\n").map((l) => `               ${l}`).join("\n");
}
