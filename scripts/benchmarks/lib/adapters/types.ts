import type { SessionUsage } from "../usage.ts";

export interface AgentAdapter {
  /** IDE identifier */
  readonly ide: "cursor" | "claude" | "opencode";

  /** Config directory name relative to sandbox (e.g. ".cursor", ".claude") */
  readonly configDir: string;

  /** Binary name or path */
  readonly command: string;

  /** Build CLI arguments for a single agent step */
  buildArgs(opts: {
    model: string;
    workspace: string;
    prompt: string;
    sessionId?: string;
  }): string[];

  /** Parse raw stdout into structured output */
  parseOutput(stdout: string): ParsedAgentOutput;

  /** Extra environment variables needed for this IDE's CLI */
  getEnv(): Record<string, string>;

  /** Setup tool mocks in the sandbox (hooks mechanism is IDE-specific) */
  setupMocks(sandboxPath: string, mocks: Record<string, string>): Promise<void>;

  /** Calculate token usage for a session (best-effort, may return null) */
  calculateUsage(sessionId: string): Promise<SessionUsage | null>;
}

export interface ParsedAgentOutput {
  sessionId: string | null;
  result: string | null;
  subtype: string | null; // "success" | "input_required" | "error"
  raw: unknown;
}
