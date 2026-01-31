export interface AgentOptions {
  workspace: string;
  model: string;
  prompt?: string;
  env?: Record<string, string>;
  /** Optional path to cursor-agent binary. Defaults to "cursor-agent" */
  commandPath?: string;
  /** Maximum number of resume steps. Defaults to 10. */
  maxSteps?: number;
  /** Maximum execution time in milliseconds for a single step. Defaults to 60000 (1 minute). */
  stepTimeout?: number;
}

export interface AgentResult {
  code: number;
  logs: string;
}

/**
 * Encapsulates the execution of a cursor-agent process using Deno.Command.
 * Handles automatic flag generation, output monitoring, and lifecycle management (resume).
 */
export class SpawnedAgent {
  private process: Deno.ChildProcess | null = null;
  private fullLog: string[] = [];
  private outputBuffer: string = "";
  private isFinished: boolean = false;
  private sessionId: string | null = null;
  private parsedResult: Record<string, unknown> | null = null;

  private exitPromise: Promise<AgentResult> | null = null;
  private resolveExit!: (res: AgentResult) => void;

  constructor(private options: AgentOptions) {}

  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Runs the agent until completion, handling input requests via callback.
   * @param onInputRequired Callback to get user input when agent is waiting.
   */
  async run(
    onInputRequired?: (logs: string) => Promise<string | null>,
  ): Promise<AgentResult> {
    const maxSteps = this.options.maxSteps || 10;
    const stepTimeout = this.options.stepTimeout || 60000;
    let finalResult: AgentResult = { code: 0, logs: "" };
    let nextPrompt = this.options.prompt || "";

    for (let step = 0; step < maxSteps; step++) {
      // Log step start with query
      await this.logAction(
        step === 0 ? "start" : "resume",
        step + 1,
        maxSteps,
        nextPrompt,
      );

      await this.start(nextPrompt);

      // Wait with timeout
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

      // Check if agent finished task definitively
      if (this.isTaskFinished(finalResult.logs)) {
        await this.logAction("done", step + 1, maxSteps);
        break;
      }

      // If not finished, we MUST continue.
      // Try to get user input if callback is provided.
      if (onInputRequired) {
        const input = await onInputRequired(this.fullLog.join(""));
        if (input && input !== "WAIT") {
          nextPrompt = input;
        } else {
          // Agent not finished, but user has nothing to say or simulator said WAIT.
          // We resume with a default prompt to let agent continue its internal logic.
          nextPrompt = "Continue";
        }
      } else {
        nextPrompt = "Continue";
      }
    }

    return finalResult;
  }

  private async logAction(
    action: "start" | "resume" | "done",
    step: number,
    maxSteps: number,
    prompt?: string,
  ) {
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

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
  start(prompt: string): void {
    this.isFinished = false;
    this.outputBuffer = "";
    this.exitPromise = new Promise((resolve) => {
      this.resolveExit = resolve;
    });

    const command = this.options.commandPath || "cursor-agent";
    const args = this.buildArgs(prompt);

    const cmd = new Deno.Command(command, {
      args,
      cwd: this.options.workspace,
      env: this.options.env || {},
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
      this.monitorProcess();
    } catch (e) {
      this.fullLog.push(`Error starting process: ${e}\n`);
      this.cleanup(1);
    }
  }

  private buildArgs(prompt: string): string[] {
    const args = [
      "--model",
      this.options.model,
      "--workspace",
      this.options.workspace,
      "--force",
      "--approve-mcps",
      "--print",
      "--output-format",
      "json",
    ];

    if (this.sessionId) {
      args.push("--resume", this.sessionId);
    }

    if (prompt) {
      args.push(prompt);
    }

    return args;
  }

  private async monitorProcess() {
    if (!this.process) return;

    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

    try {
      // We read both stdout and stderr
      const stdoutReader = this.process.stdout.getReader();
      const stderrReader = this.process.stderr.getReader();

      const readStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
      ) => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            this.outputBuffer += text;
            this.fullLog.push(text);
          }
        } catch (e) {
          if (!(e instanceof Deno.errors.Interrupted)) {
            this.fullLog.push(`\n[Stream Error] ${e}\n`);
          }
        } finally {
          reader.releaseLock();
        }
      };

      // Run both readers in parallel
      await Promise.all([
        readStream(stdoutReader),
        readStream(stderrReader),
      ]);

      // Final flush
      const finalFlush = decoder.decode();
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
    if (!this.parsedResult) return;

    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    let firstLine = "";

    const result = this.parsedResult.result as
      | Record<string, unknown>
      | undefined;
    if (result && typeof result === "object" && result.result) {
      firstLine = this.getFirstChars(String(result.result));
    } else if (typeof this.parsedResult.result === "string") {
      firstLine = this.getFirstChars(this.parsedResult.result);
    }

    if (!firstLine) {
      const messages = this.parsedResult.messages as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg.content) {
            firstLine = this.getFirstChars(String(msg.content));
            if (firstLine) break;
          }
        }
      }
    }

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
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (obj.session_id) {
        this.sessionId = obj.session_id;
      }
      this.parsedResult = obj;
    } catch (_) {
      // Ignore parse errors
    }
  }

  private isTaskFinished(_logs: string): boolean {
    if (this.parsedResult && this.parsedResult.result) {
      return true;
    }
    return false;
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
   * Forcefully terminates the agent process.
   */
  kill() {
    if (this.isFinished) return;

    if (this.process) {
      try {
        this.process.kill("SIGINT");
      } catch (_) { /* ignore */ }
    }
    this.cleanup(130);
  }

  private cleanup(code: number) {
    if (this.isFinished) return;
    this.isFinished = true;

    const result = {
      code,
      logs: this.fullLog.join(""),
    };

    if (this.resolveExit) {
      this.resolveExit(result);
    }
  }
}
