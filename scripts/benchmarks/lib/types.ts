export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
  type?: "static" | "semantic";
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  targetAgentPath?: string; // Path to the agent/skill .md file
  skill?: string; // Skill identifier (e.g., "flow-plan")

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
   * Simulated user persona for interactive Q&A.
   * Describes the user's preferences and goals to the Simulated User LLM.
   */
  userPersona?: string;

  /**
   * Whether the scenario is interactive.
   * If true, the UserEmulator will be used to interact with the agent.
   */
  interactive?: boolean;

  /**
   * Custom system instructions template.
   * @deprecated Context is now discovered natively by cursor-agent.
   */
  systemInstructionsTemplate?: string;

  /**
   * AGENTS.md content.
   * If provided as string, it will be used.
   * If not provided, the runner will try to load it from the scenario's fixture directory.
   */
  agentsMarkdown?: string;
}

/**
 * Base class for scenarios that target a specific skill from the framework.
 * Automatically builds targetAgentPath from the skill ID.
 */
export abstract class BenchmarkSkillScenario implements BenchmarkScenario {
  abstract id: string;
  abstract name: string;
  abstract skill: string;
  abstract userQuery: string;
  abstract checklist: BenchmarkChecklistItem[];

  get targetAgentPath(): string {
    return `framework/skills/${this.skill}/SKILL.md`;
  }

  setup(_sandboxPath: string): Promise<void> {
    return Promise.resolve();
  }
}

export interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  score: number; // Percentage of passed checks (0-100)
  errorsCount: number; // Number of critical failures
  warningsCount: number; // Number of non-critical failures
  durationMs: number;
  tokensUsed: number;
  tokensDetails?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
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
