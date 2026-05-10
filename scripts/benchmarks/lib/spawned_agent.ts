import { fromFileUrl } from "@std/path";
import type { AgentAdapter } from "./adapters/types.ts";
import { ansi } from "../../utils.ts";
import { startWatchdog, type WatchdogHandle } from "./process_watchdog.ts";
import {
  assertHealthy,
  describeHealth,
  SystemUnhealthyError,
} from "./system_health.ts";

/**
 * Python wrapper that calls `setsid()` then `execvp(target, args)`. Spawning
 * the agent through it places `claude` (or any other CLI) in its own process
 * group so the watchdog can SIGKILL the entire group — including orphans
 * that have re-parented to PID 1. Path is resolved at module load time via
 * `import.meta.url` so it survives different cwd layouts (bench root, test
 * worktree, etc.).
 */
const SETPGRP_WRAPPER = fromFileUrl(
  new URL("./setpgrp_exec.py", import.meta.url),
);

export interface AgentOptions {
  workspace: string;
  model: string;
  prompt?: string;
  env?: Record<string, string>;
  /** Agent adapter for IDE-specific behavior. */
  adapter: AgentAdapter;
  /** @deprecated Use adapter instead. Optional path to cursor-agent binary. */
  commandPath?: string;
  /** Maximum number of resume steps. Defaults to 10. */
  maxSteps?: number;
  /** Maximum execution time in milliseconds for a single step. Defaults to 60000 (1 minute). */
  stepTimeout?: number;
  /** Session name for IDE identification (e.g. "skill/scenario"). */
  name?: string;
  /** Programmatic-only no-op. Disables the watchdog AND skips the
   *  setpgrp_exec.py wrapper (so the agent runs unwrapped during tests).
   *  Production callers MUST NOT set this — there is no env-var path to
   *  bypass the watchdog. Tests for SpawnedAgent's lifecycle set this
   *  explicitly to avoid races with mock subprocesses. */
  disableWatchdog?: boolean;
}

export interface AgentResult {
  code: number;
  logs: string;
}

/**
 * Encapsulates the execution of an IDE agent process using Deno.Command.
 * Delegates CLI-specific logic (args, output parsing) to an AgentAdapter.
 * Handles lifecycle management: start, monitor, resume loop.
 */
export class SpawnedAgent {
  private process: Deno.ChildProcess | null = null;
  private watchdog: WatchdogHandle | null = null;
  private fullLog: string[] = [];
  private outputBuffer: string = "";
  private isFinished: boolean = false;
  private sessionId: string | null = null;
  private parsedSubtype: string | null = null;
  private parsedResultText: string | null = null;
  private messages: Array<{ role: string; content: string }> = [];
  private adapter: AgentAdapter;

  private exitPromise: Promise<AgentResult> | null = null;
  private resolveExit!: (res: AgentResult) => void;

  constructor(private options: AgentOptions) {
    this.adapter = options.adapter;
  }

  /** Returns the session ID assigned by the agent process (used for resume). */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /** Returns the accumulated conversation history (user + assistant turns). */
  public getMessages(): Array<{ role: string; content: string }> {
    return this.messages;
  }

  /**
   * Runs the agent until completion.
   * If the agent needs input and a user emulator is provided, it will be used.
   * Otherwise, the first result is considered final.
   */
  async run(
    userEmulator?: {
      getResponse: (
        messages: Array<{ role: string; content: string }>,
      ) => Promise<string | null>;
    },
  ): Promise<AgentResult> {
    const maxSteps = this.options.maxSteps || 10;
    const stepTimeout = this.options.stepTimeout || 60000;
    let finalResult: AgentResult = { code: 0, logs: "" };
    let nextPrompt = this.options.prompt || "";

    for (let step = 0; step < maxSteps; step++) {
      await this.logAction(
        step === 0 ? "start" : "resume",
        step + 1,
        maxSteps,
        nextPrompt,
      );

      await this.start(nextPrompt);

      let timeoutId: number | undefined;
      const timeoutPromise = new Promise<AgentResult>((_, reject) => {
        timeoutId = setTimeout(() => {
          this.kill();
          reject(new Error(`Step timeout after ${stepTimeout}ms`));
        }, stepTimeout);
      });

      try {
        const stepResult = await Promise.race([this.wait(), timeoutPromise]);
        if (timeoutId) clearTimeout(timeoutId);
        finalResult = stepResult;
      } catch (e) {
        if (timeoutId) clearTimeout(timeoutId);
        const error = e as Error;
        this.fullLog.push(`\n[Timeout Error] ${error.message}\n`);
        finalResult = { code: 124, logs: this.fullLog.join("") };
        break;
      }

      // If we have a user emulator, try to get a response to continue
      if (userEmulator) {
        const input = await userEmulator.getResponse(this.messages);
        if (input && input !== "WAIT") {
          this.fullLog.push(`\n[USER INPUT] ${input}\n`);
          nextPrompt = input;
          continue;
        }
      }

      // If no emulator or no input from it, we are done
      break;
    }

    return finalResult;
  }

  private async logAction(
    action: "start" | "resume" | "done",
    step: number,
    maxSteps: number,
    prompt?: string,
  ) {
    const gray = ansi("\x1b[90m");
    const reset = ansi("\x1b[0m");

    let message = "";
    switch (action) {
      case "start":
      case "resume": {
        const prefix = action === "resume"
          ? `[${step}/${maxSteps}] -> `
          : `-> `;
        const text = prompt ? this.getFirstChars(prompt) : "";
        message = `${prefix}${text}`;
        break;
      }
      case "done":
        message = `[done]`;
        break;
    }

    const output = `${gray}${message}${reset}\n`;
    await Deno.stdout.write(new TextEncoder().encode(output));
  }

  /**
   * Starts the agent process for a single step.
   * @private
   */
  async start(prompt: string): Promise<void> {
    this.isFinished = false;
    this.outputBuffer = "";
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });

    // implements [FR-BENCH-GUARDS](../../../documents/requirements.md#fr-bench-guards-resource-guards-for-spawned-agents)
    // Bail out before spawning when host is already under memory/CPU pressure
    // that risks an OOM hang of the kind seen on 2026-05-09 07:50
    // (vm-compressor-space-shortage). Skipped on non-darwin only — there is
    // no env-var bypass.
    try {
      const h = await assertHealthy(
        undefined,
        `agent ${this.options.name ?? ""}`.trim(),
      );
      if (h.platform === "darwin") {
        this.fullLog.push(`[health] ${describeHealth(h)}\n`);
      }
    } catch (e) {
      if (e instanceof SystemUnhealthyError) {
        this.fullLog.push(`\n[health] aborting spawn: ${e.message}\n`);
        console.error(`[health] ${e.message}`);
        this.cleanup(/* exit code */ 75); // 75 = EX_TEMPFAIL
        return;
      }
      throw e;
    }

    if (prompt) {
      // Avoid duplicating the prompt if we are resuming with the same prompt
      const lastMsg = this.messages[this.messages.length - 1];
      if (
        !lastMsg || lastMsg.role !== "user" || lastMsg.content !== prompt
      ) {
        this.messages.push({ role: "user", content: prompt });
      }
    }

    const command = this.options.commandPath || this.adapter.command;
    const args = this.adapter.buildArgs({
      model: this.options.model,
      workspace: this.options.workspace,
      prompt,
      sessionId: this.sessionId || undefined,
      name: this.options.name,
    });

    // Wrap the agent in setpgrp_exec.py so it becomes the leader of its own
    // process group. Required for the watchdog's group-kill path — see
    // process_watchdog.ts header. Skipped only when the caller passes
    // `disableWatchdog: true` (programmatic, test-only).
    const wrapInGroup = !this.options.disableWatchdog;
    const spawnCommand = wrapInGroup ? "python3" : command;
    const spawnArgs = wrapInGroup ? [SETPGRP_WRAPPER, command, ...args] : args;

    const cmd = new Deno.Command(spawnCommand, {
      args: spawnArgs,
      cwd: this.options.workspace,
      env: { ...this.adapter.getEnv(), ...this.options.env },
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    try {
      this.process = cmd.spawn();
      // Close stdin immediately as we don't need it for most cases
      // and it prevents resource leaks in tests
      try {
        this.process.stdin.close();
      } catch (_) { /* ignore */ }
      this.watchdog = startWatchdog(this.process.pid, {
        disabled: this.options.disableWatchdog,
        onTrip: (trip) => {
          const tag = trip.cause === "fork-loop"
            ? "[fork-loop guard]"
            : "[rss-bloat guard]";
          const msg = `\n${tag} killed agent tree: ${trip.reason}\n` +
            `${tag} killed pids: ${trip.killedPids.join(", ")}\n`;
          this.fullLog.push(msg);
          console.error(msg.trimEnd());
        },
      });
      this.monitorProcess();
    } catch (e) {
      this.fullLog.push(`Error starting process: ${e}\n`);
      this.cleanup(1);
    }
  }

  /**
   * Reads stdout (for parsing) and stderr (for debug) in parallel.
   * With stream-json, stdout emits NDJSON lines in real-time,
   * so logs are available even on timeout (unlike json format).
   * Note: stream-json duplicates events to stderr, so we only parse stdout.
   */
  private async monitorProcess() {
    if (!this.process) return;

    const stdoutDecoder = new TextDecoder("utf-8", {
      fatal: false,
      ignoreBOM: true,
    });
    const stderrDecoder = new TextDecoder("utf-8", {
      fatal: false,
      ignoreBOM: true,
    });

    try {
      const stdoutReader = this.process.stdout.getReader();
      const stderrReader = this.process.stderr.getReader();

      // Read stdout — primary source for parsing and logs
      const readStdout = async () => {
        try {
          while (true) {
            const { done, value } = await stdoutReader.read();
            if (done) break;
            const text = stdoutDecoder.decode(value, { stream: true });
            this.outputBuffer += text;
            this.fullLog.push(text);
          }
        } catch (e) {
          if (!(e instanceof Deno.errors.Interrupted)) {
            this.fullLog.push(`\n[Stream Error] ${e}\n`);
          }
        } finally {
          stdoutReader.releaseLock();
        }
      };

      // Drain stderr to prevent pipe buffer deadlock (don't add to outputBuffer)
      const drainStderr = async () => {
        try {
          while (true) {
            const { done, value } = await stderrReader.read();
            if (done) break;
            // Only capture non-JSON stderr (error messages, not stream-json duplicates)
            const text = stderrDecoder.decode(value, { stream: true });
            if (text.trim() && !text.trim().startsWith("{")) {
              this.fullLog.push(`[stderr] ${text}`);
            }
          }
        } catch (_) {
          // Ignore stderr read errors
        } finally {
          stderrReader.releaseLock();
        }
      };

      await Promise.all([readStdout(), drainStderr()]);

      // Final flush for stdout
      const finalFlush = stdoutDecoder.decode();
      if (finalFlush) {
        this.outputBuffer += finalFlush;
        this.fullLog.push(finalFlush);
      }

      const status = await this.process.status;
      this.parseOutput(this.outputBuffer);
      await this.printFormattedOutput();
      this.cleanup(status.code);
    } catch (e) {
      if (!(e instanceof Deno.errors.Interrupted)) {
        console.error("Process Monitor error:", e);
      }
      this.cleanup(1);
    }
  }

  private async printFormattedOutput() {
    if (!this.parsedResultText) return;

    const gray = ansi("\x1b[90m");
    const reset = ansi("\x1b[0m");
    const firstLine = this.getFirstChars(this.parsedResultText);

    if (firstLine) {
      const output = `${gray}<- ${firstLine}${reset}\n`;
      await Deno.stdout.write(new TextEncoder().encode(output));
    }
  }

  private getFirstChars(text: string, maxLen = 40): string {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned.length === 0) return "";
    return cleaned.slice(0, maxLen) + (cleaned.length > maxLen ? "..." : "");
  }

  private parseOutput(output: string) {
    const parsed = this.adapter.parseOutput(output);

    if (parsed.sessionId) {
      this.sessionId = parsed.sessionId;
    }
    this.parsedSubtype = parsed.subtype;
    this.parsedResultText = parsed.result;

    // Use full assistantText for messages (gives UserEmulator full context
    // including proposals and questions, not just the final result summary)
    const textForMessages = parsed.assistantText || parsed.result;
    if (textForMessages) {
      const lastMsg = this.messages[this.messages.length - 1];
      if (
        !lastMsg || lastMsg.role !== "assistant" ||
        lastMsg.content !== textForMessages
      ) {
        this.messages.push({ role: "assistant", content: textForMessages });
      }
    }
  }

  /**
   * Writes text to the agent's stdin.
   */
  writeInput(_input: string) {
    // Stdin is closed in start() to prevent leaks.
    // If we need interactive stdin in the future, we should manage its lifecycle.
    this.fullLog.push(`[STDIN] (ignored, stdin closed) ${_input}\n`);
  }

  /**
   * Waits for the current agent process to finish.
   */
  wait(): Promise<AgentResult> {
    if (!this.exitPromise) {
      throw new Error("Agent not started");
    }
    return this.exitPromise;
  }

  /**
   * Forcefully terminates the agent process AND its entire process group
   * (set up by setpgrp_exec.py via os.setsid()). Killing only the leader
   * leaves orphaned grandchildren / background sleeps alive — observed as
   * Deno test resource leaks during mock-agent runs.
   */
  kill() {
    if (this.isFinished) return;

    if (this.process) {
      const pid = this.process.pid;
      try {
        // Negative pid = signal the entire process group. Works whether or
        // not the wrapper layer is active: when disabled the agent shares
        // the runner's group, in which case `Deno.kill(-pid, ...)` is a
        // no-op (no group with that pgid). To stay safe we also signal the
        // leader directly.
        Deno.kill(-pid, "SIGINT");
      } catch (_) { /* group already gone */ }
      try {
        this.process.kill("SIGINT");
      } catch (_) { /* leader already gone */ }
    }
    this.cleanup(130);
  }

  private cleanup(code: number) {
    if (this.isFinished) return;
    this.isFinished = true;
    try {
      this.watchdog?.stop();
    } catch { /* ignore */ }

    const trip = this.watchdog?.trip();
    const finalCode = trip ? 137 : code;

    const result = {
      code: finalCode,
      logs: this.fullLog.join(""),
    };

    if (this.resolveExit) {
      this.resolveExit(result);
    }
  }
}
