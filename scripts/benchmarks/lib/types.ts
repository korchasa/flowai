export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
  type?: "static" | "semantic";
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  targetAgentPath: string; // Path to the agent/skill .md file

  /**
   * Setup the sandbox environment.
   * @param sandboxPath Absolute path to the temporary sandbox directory
   */
  setup: (sandboxPath: string) => Promise<void>;

  /**
   * Path to the fixture directory (optional).
   * If provided, contents will be copied to the sandbox before setup.
   * If not provided, the runner may look for a 'fixture' directory relative to the scenario's 'mod.ts'.
   */
  fixturePath?: string;

  /**
   * The initial query from the user to the agent.
   */
  userQuery: string;

  /**
   * Checklist for the LLM Judge to verify.
   */
  checklist: BenchmarkChecklistItem[];

  /**
   * Mocks for external tools.
   * Key: Tool name (e.g., "gh")
   * Value: Script content (e.g., "echo 'PR Created'")
   */
  mocks?: Record<string, string>;

  /**
   * Maximum number of steps in the REPL loop.
   * Defaults to 10.
   */
  maxSteps?: number;

  /**
   * Timeout for each step in milliseconds.
   * Covers both LLM response and command execution.
   * Defaults to no timeout.
   */
  stepTimeoutMs?: number;

  /**
   * List of simulated user replies to send when the agent pauses (issues no commands).
   * Used for testing interactive flows.
   */
  userReplies?: string[];

  /**
   * Custom system instructions template.
   * If provided, it will be used instead of the default one.
   * Should contain {{AGENTS}} and {{SKILL}} placeholders.
   */
  systemInstructionsTemplate?: string;

  /**
   * AGENTS.md content.
   * If provided as string, it will be used.
   * If not provided, the runner will try to load it from the scenario's fixture directory.
   * If still not found, the benchmark will fail as AGENTS.md is now mandatory.
   */
  agentsMarkdown?: string;
}

export interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  score: number; // Percentage of passed checks (0-100)
  errorsCount: number; // Number of critical failures
  warningsCount: number; // Number of non-critical failures
  durationMs: number;
  tokensUsed: number;
  totalCost: number;
  toolCallsCount: number;
  model: string;
  checklistResults: Record<string, { pass: boolean; reason: string }>;
  logs: string; // Full conversation log
  evidence?: string; // Debug evidence
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
  };
}
