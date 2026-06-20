/**
 * ACP agent executor (FR-ACCEPT.ACP) — the transport-side replacement for
 * `SpawnedAgent`. Spawns an IDE's ACP server from the data-only registry,
 * preserving FR-ACCEPT-GUARDS (setpgrp process group + watchdog + health gate),
 * and drives the conversation over the official ACP client:
 *
 *   spawn(registry.launch) under setpgrp_exec.py
 *     → AcpClient over the child's stdio
 *     → initialize → session/new → session/prompt (turn 1)
 *     → [UserEmulator] session/prompt on the SAME session (multi-turn, no
 *        `--resume` reparse — ACP keeps the session)
 *     → accumulate a readable transcript for the judge.
 *
 * Mocks are intercepted in the client (one implementation for all IDEs),
 * replacing the per-IDE hook writers. Errors map to a non-zero exit code via the
 * client's deterministic failure verdict (FR-ACCEPT.ACP error mapping).
 */
import { dirname, fromFileUrl, join } from "@std/path";
import { ndJsonStream } from "@zed-industries/agent-client-protocol";
import { startWatchdog, type WatchdogHandle } from "../process_watchdog.ts";
import {
  assertHealthy,
  describeHealth,
  SystemUnhealthyError,
} from "../system_health.ts";
import { AcpClient } from "./client.ts";
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

/** Executes one IDE agent over ACP for the full (multi-turn) scenario. */
export class AcpAgent {
  #child: Deno.ChildProcess | null = null;
  #watchdog: WatchdogHandle | null = null;
  #sessionId: string | null = null;
  #messages: Message[] = [];
  #log: string[] = [];
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
