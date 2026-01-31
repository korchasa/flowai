import { Pty } from "@sigma/pty-ffi";

export interface AgentOptions {
  workspace: string;
  model: string;
  prompt?: string;
  env?: Record<string, string>;
  /** Optional path to cursor-agent binary. Defaults to "cursor-agent" */
  commandPath?: string;
  /** Maximum number of resume steps. Defaults to 10. */
  maxSteps?: number;
}

export interface AgentResult {
  code: number;
  logs: string;
}

/**
 * Encapsulates the execution of a cursor-agent process in a PTY.
 * Handles automatic flag generation, output monitoring, and lifecycle management (resume).
 */
export class SpawnedAgent {
  private pty: Pty | null = null;
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
      const result = await this.wait();
      finalResult = result;

      // Check if agent finished task definitively
      if (this.isTaskFinished(result.logs)) {
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
          // "Continue" is a safe bet for cursor-agent to proceed with next steps.
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

    this.pty = new Pty(command, {
      args,
      cwd: this.options.workspace,
      env: this.options.env || {},
    });

    this.monitorPty();
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

  private async monitorPty() {
    if (!this.pty) return;

    const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

    try {
      const readable = this.pty.readable as unknown as AsyncIterable<
        string | Uint8Array
      >;

      for await (const chunk of readable) {
        let text: string;

        if (typeof chunk === "string") {
          text = chunk;
        } else {
          text = decoder.decode(chunk, { stream: true });
        }

        this.outputBuffer += text;
        this.fullLog.push(text);
      }

      // Final flush
      const finalFlush = decoder.decode();
      if (finalFlush) {
        this.outputBuffer += finalFlush;
        this.fullLog.push(finalFlush);
      }

      // Parse complete JSON output after process ends
      this.parseOutput(this.outputBuffer);

      // Print extracted message in gray color
      await this.printFormattedOutput();
    } catch (e) {
      if (!(e instanceof Deno.errors.Interrupted)) {
        console.error("PTY Monitor error:", e);
      }
    } finally {
      this.cleanup(0);
    }
  }

  private async printFormattedOutput() {
    if (!this.parsedResult) return;

    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    // Extract first non-empty line from result or messages
    let firstLine = "";

    // Try result first
    const result = this.parsedResult.result as
      | Record<string, unknown>
      | undefined;
    if (result && typeof result === "object" && result.result) {
      firstLine = this.getFirstChars(String(result.result));
    } else if (typeof this.parsedResult.result === "string") {
      firstLine = this.getFirstChars(this.parsedResult.result);
    }

    // If no result, try messages
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
    // Find JSON object in output (may have non-JSON text around it)
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    try {
      const obj = JSON.parse(jsonMatch[0]);

      // Extract session_id from root
      if (obj.session_id) {
        this.sessionId = obj.session_id;
      }

      // Store parsed result for isTaskFinished check
      this.parsedResult = obj;
    } catch (_) {
      // Ignore parse errors
    }
  }

  private isTaskFinished(_logs: string): boolean {
    // Check if parsedResult has result field (indicates task completion)
    if (this.parsedResult && this.parsedResult.result) {
      return true;
    }
    return false;
  }

  /**
   * Writes text to the agent's stdin.
   */
  async writeInput(input: string) {
    if (!this.pty || this.isFinished) return;
    try {
      await this.pty.write(input + "\n");
      this.fullLog.push(`[STDIN] ${input}\n`);
    } catch (_) {
      // Ignore write errors if process is closing
    }
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
  async kill() {
    if (this.isFinished) return;

    if (this.pty) {
      try {
        await this.pty.write("\x03");
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
