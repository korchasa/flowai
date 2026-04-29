// [FR-LOOP](../../documents/requirements.md#fr-loop-non-interactive-runner-flowai-loop) — non-interactive Claude Code runner
/**
 * flowai loop — non-interactive Claude Code runner.
 * Launches claude CLI with a prompt, processes stream-json output, handles exit codes and loop iteration.
 */

/** Options for the loop command */
export interface LoopOptions {
  agent?: string;
  prompt: string;
  model?: string;
  cwd?: string;
  yolo?: boolean;
  timeout?: number;
  interval?: string;
  maxIterations?: number;
}

/** Result from processing an NDJSON stream */
export interface StreamResult {
  completed: boolean;
  success: boolean;
  // deno-lint-ignore no-explicit-any
  resultEvent?: Record<string, any>;
}

/** Stream event from Claude CLI stream-json output */
export interface StreamEvent {
  type: string;
  subtype?: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

const KILL_GRACE_MS = 30_000;

/** Parse interval string ("30s", "5m", "1h") to milliseconds */
export function parseInterval(str: string): number {
  const match = str.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(
      `Invalid interval format: "${str}". Use <number><s|m|h> (e.g., "30s", "5m", "1h")`,
    );
  }
  const value = parseInt(match[1], 10);
  if (value <= 0) {
    throw new Error(`Interval value must be positive, got: ${value}`);
  }
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };
  return value * multipliers[unit];
}

/** Build claude CLI args from loop options. Always uses stream-json + verbose. */
export function buildClaudeArgs(options: LoopOptions): string[] {
  const args: string[] = ["-p"];

  if (options.yolo) {
    args.push("--dangerously-skip-permissions");
  }
  if (options.model) {
    args.push("--model", options.model);
  }
  args.push("--output-format", "stream-json", "--verbose");
  if (options.cwd) {
    args.push("--cwd", options.cwd);
  }

  if (options.agent) {
    args.push("--agent", options.agent);
  }
  args.push(options.prompt);

  return args;
}

/** Truncate text to max length with ellipsis */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

/** Stateful formatter that tracks agent nesting depth */
export class StreamFormatter {
  depth = 0;

  /** Indent prefix for current depth ("  " per level) */
  private indent(): string {
    return "  ".repeat(this.depth);
  }

  /** Format a stream-json event as ANSI one-liner for terminal */
  format(event: StreamEvent): string {
    switch (event.type) {
      case "system": {
        if (event.subtype === "init") {
          const toolCount = Array.isArray(event.tools)
            ? event.tools.length
            : (event.tools ?? "?");
          return `\x1b[36m[init]\x1b[0m model=${
            event.model ?? "?"
          } tools=${toolCount}`;
        }
        if (event.subtype === "task_started") {
          this.depth++;
          const desc = event.description ?? "";
          return `${this.indent()}\x1b[35m[agent:start] ${desc}\x1b[0m`;
        }
        if (event.subtype === "task_progress") {
          const tool = event.last_tool_name ?? "";
          const desc = event.description ?? "";
          return `${this.indent()}\x1b[35m[agent:call] ${desc}${
            tool ? ` -> ${tool}` : ""
          }\x1b[0m`;
        }
        if (event.subtype === "task_notification") {
          const status = event.status ?? "?";
          const duration = event.usage?.duration_ms
            ? `${(event.usage.duration_ms / 1000).toFixed(1)}s`
            : "";
          const tools = event.usage?.tool_uses ?? "";
          const line = `${this.indent()}\x1b[35m[agent:done] ${status}${
            duration ? ` (${duration})` : ""
          }${tools ? ` tools=${tools}` : ""}\x1b[0m`;
          if (this.depth > 0) this.depth--;
          return line;
        }
        return "";
      }
      case "assistant": {
        const blocks = event.message?.content ?? event.content ?? [];
        const lines: string[] = [];
        const pad = this.indent();
        for (const block of blocks) {
          if (block.type === "text") {
            lines.push(
              `${pad}\x1b[37m[text]\x1b[0m ${truncate(block.text ?? "", 80)}`,
            );
          } else if (block.type === "tool_use") {
            const input = block.input
              ? truncate(JSON.stringify(block.input), 60)
              : "";
            lines.push(
              `${pad}\x1b[33m[call]\x1b[0m ${block.name ?? "?"}${
                input ? " " + input : ""
              }`,
            );
          }
        }
        return lines.join("\n");
      }
      case "user": {
        const blocks = event.message?.content ?? event.content ?? [];
        const lines: string[] = [];
        const pad = this.indent();
        for (const block of blocks) {
          if (block.type === "tool_result") {
            const content = typeof block.content === "string"
              ? block.content
              : JSON.stringify(block.content ?? "");
            const status = block.is_error ? "err" : "ok";
            lines.push(
              `${pad}\x1b[90m[result] ${status}: ${
                truncate(content, 70)
              }\x1b[0m`,
            );
          }
        }
        return lines.join("\n");
      }
      case "result": {
        const duration = event.duration_ms
          ? `(${(event.duration_ms / 1000).toFixed(1)}s)`
          : "";
        const cost = event.total_cost_usd != null
          ? `$${event.total_cost_usd.toFixed(4)}`
          : "";
        const turns = event.num_turns != null ? `turns=${event.num_turns}` : "";
        const color = event.subtype === "error" ? "\x1b[31m" : "\x1b[32m";
        const label = event.subtype === "error" ? "[error]" : "[ok]";
        return `${color}${label} ${event.subtype ?? "?"}${
          duration ? " " + duration : ""
        }${cost ? " " + cost : ""}${turns ? " " + turns : ""}\x1b[0m`;
      }
      default:
        return "";
    }
  }
}

/** Stateless convenience wrapper (no nesting tracking) */
export function formatStreamEvent(event: StreamEvent): string {
  return new StreamFormatter().format(event);
}

/** Process NDJSON stream from Claude CLI stdout */
export async function processNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<StreamResult> {
  const decoder = new TextDecoder();
  let buffer = "";
  // deno-lint-ignore no-explicit-any
  let resultEvent: Record<string, any> | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Last element is incomplete line (or empty string after trailing \n)
    buffer = lines.pop()!;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event: StreamEvent = JSON.parse(trimmed);
        onEvent(event);
        if (event.type === "result") {
          resultEvent = event;
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const event: StreamEvent = JSON.parse(buffer.trim());
      onEvent(event);
      if (event.type === "result") {
        resultEvent = event;
      }
    } catch {
      // Skip malformed remaining
    }
  }

  return {
    completed: resultEvent !== undefined,
    success: resultEvent !== undefined && !resultEvent.is_error,
    resultEvent,
  };
}

/** Single claude run with stream-json output */
export async function runOnce(options: LoopOptions): Promise<number> {
  const args = buildClaudeArgs(options);

  const cmd = new Deno.Command("claude", {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "inherit",
    cwd: options.cwd,
    env: { ...Deno.env.toObject(), CLAUDECODE: "" },
  });

  const process = cmd.spawn();

  // Timeout handling
  let timeoutId: number | undefined;
  if (options.timeout) {
    timeoutId = setTimeout(() => {
      try {
        process.kill("SIGTERM");
      } catch { /* process may have already exited */ }
    }, options.timeout * 1000);
  }

  const reader = process.stdout.getReader();
  const fmt = new StreamFormatter();
  const streamResult = await processNDJSONStream(reader, (event) => {
    const line = fmt.format(event);
    if (line) console.log(line);
  });

  // Hang workaround: after result event, wait up to KILL_GRACE_MS then SIGKILL
  if (streamResult.resultEvent) {
    const raceResult = await Promise.race([
      process.status,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), KILL_GRACE_MS)
      ),
    ]);
    if (raceResult === null) {
      try {
        process.kill("SIGKILL");
      } catch { /* already exited */ }
    }
  }
  const processStatus = await process.status;

  if (timeoutId !== undefined) clearTimeout(timeoutId);

  // Exit code: resultEvent.is_error > process exit code > 1
  if (streamResult.resultEvent) {
    return streamResult.resultEvent.is_error ? 1 : 0;
  }
  return processStatus.code !== 0 ? processStatus.code : 1;
}

/** Loop runner: runOnce + sleep(interval) + iteration check */
export async function runLoop(options: LoopOptions): Promise<number> {
  const intervalMs = options.interval ? parseInterval(options.interval) : 0;
  const maxIterations = options.maxIterations ?? Infinity;

  let lastExitCode = 0;

  for (let i = 0; i < maxIterations; i++) {
    lastExitCode = await runOnce(options);

    if (lastExitCode !== 0) break;
    if (i + 1 < maxIterations && intervalMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return lastExitCode;
}
