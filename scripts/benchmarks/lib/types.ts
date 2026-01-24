export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
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
   * The initial query from the user to the agent.
   */
  userQuery: string;

  /**
   * Checklist for the LLM Judge to verify.
   */
  checklist: BenchmarkChecklistItem[];
}

export interface BenchmarkResult {
  scenarioId: string;
  success: boolean;
  score: number; // Percentage of passed checks (0-100)
  durationMs: number;
  tokensUsed: number;
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
  };
}
