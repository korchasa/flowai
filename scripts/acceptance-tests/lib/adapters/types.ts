import type { SessionUsage } from "../usage.ts";

/**
 * Data-only IDE profile consumed by the runner under the ACP transport
 * (FR-ACCEPT.ACP). The per-IDE behavioural surface (buildArgs / parseOutput /
 * setupMocks / stream-json) was retired with the direct-CLI adapters — agents
 * are now driven through the single `AcpClient` + the data-only `ACP_AGENTS`
 * registry. What remains is the small set of facts the runner still needs:
 * which IDE, its config dir, optional sandbox `$HOME` isolation, token usage,
 * and a version string for the cache key.
 */
export interface AgentAdapter {
  /** IDE identifier. */
  readonly ide: "cursor" | "claude" | "opencode" | "codex";

  /** Config directory name relative to sandbox (e.g. ".cursor", ".claude"). */
  readonly configDir: string;

  /**
   * Optional sandbox preparation run before agent spawn. Returns env vars to
   * merge into the spawned process. Used for Claude's isolated `$HOME`
   * (FR-ACCEPT-ISOLATION) so the sandbox skills win over `~/.claude/skills/`.
   */
  prepareWorkspace?(sandboxPath: string): Promise<Record<string, string>>;

  /** Token usage for a session (best-effort; may return null). */
  calculateUsage(sessionId: string): Promise<SessionUsage | null>;

  /**
   * Version string folded into the benchmark cache-key so a transport/agent
   * upgrade invalidates stale results (FR-ACCEPT-CACHE).
   */
  cliVersion(): Promise<string>;
}

/**
 * Structured agent turn output accumulated by `AcpClient` and consumed by the
 * runner / judge / `UserEmulator`.
 */
export interface ParsedAgentOutput {
  sessionId: string | null;
  result: string | null;
  subtype: string | null; // "success" | "input_required" | "error"
  /** Full concatenated text from all assistant messages (for UserEmulator context). */
  assistantText: string | null;
  raw: unknown;
}
