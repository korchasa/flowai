export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  targetAgentPath?: string; // Path to the agent/skill .md file
  skill?: string; // Skill identifier (e.g., "flowai-plan")

  /** Pack name this scenario belongs to (auto-populated by discovery). */
  pack?: string;

  /**
   * Sandbox state when the agent starts.
   *
   * Runner lifecycle:
   *   1. Copy fixture files to sandbox
   *   2. Copy framework to IDE config dir
   *   3. `git init` + commit all framework/fixture files as "init"
   *   4. Call `setup(sandboxPath)` — scenario creates its specific git state
   *   5. Start agent
   *
   * setup() receives a sandbox with an initialized git repo where all
   * framework and fixture files are already committed. It should create
   * the desired git state on top (additional commits, modified files,
   * untracked files, etc.).
   */
  sandboxState: {
    /** Commits created by setup() on top of runner's "init" commit */
    commits: Array<{ message: string; files: string[] }>;
    /** Files left modified (tracked but changed) when agent starts */
    modified?: string[];
    /** Files left untracked (not in any commit) when agent starts */
    untracked?: string[];
    /** Expected outcome after agent finishes */
    expectedOutcome: string;
  };

  /**
   * Setup the sandbox environment.
   * Called AFTER runner initializes git with framework/fixture files committed.
   * Must NOT call setupGitRepo() — git is already initialized.
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
   * Global timeout for the entire scenario in milliseconds.
   * Kills agent and proceeds to judge with partial evidence on expiry.
   * Defaults to 900_000 (15 minutes).
   */
  totalTimeoutMs?: number;

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
   * Placeholder values for generating the unified AGENTS.md from the pack-level template.
   * Required field — runner generates AGENTS.md at runtime (single source of truth).
   * Minimum: PROJECT_NAME.
   */
  agentsTemplateVars: {
    PROJECT_NAME: string;
    PROJECT_RULES?: string;
    PROJECT_VISION?: string;
    TOOLING_STACK?: string;
    ARCHITECTURE?: string;
    KEY_DECISIONS?: string;
    /** Fills {{DEVELOPMENT_COMMANDS}} in the Development Commands section */
    DEVELOPMENT_COMMANDS?: string;
    /** Fills {{COMMAND_SCRIPTS}} in the Development Commands section */
    COMMAND_SCRIPTS?: string;
  };

  /**
   * Skip this scenario with a reason.
   * If set, the scenario will not be executed and will be reported as skipped.
   */
  skip?: string;
}

/**
 * Base class for scenarios that target a specific skill from the framework.
 * Automatically builds targetAgentPath from the skill ID.
 */
export abstract class AcceptanceTestScenario implements BenchmarkScenario {
  abstract id: string;
  abstract name: string;
  abstract skill: string;
  abstract userQuery: string;
  abstract checklist: BenchmarkChecklistItem[];
  abstract agentsTemplateVars: BenchmarkScenario["agentsTemplateVars"];

  /** Default: no setup changes, clean state. Override in subclass. */
  sandboxState: BenchmarkScenario["sandboxState"] = {
    commits: [],
    expectedOutcome: "Agent completes the task successfully",
  };

  get targetAgentPath(): string {
    // Scan pack structure: framework/<pack>/{skills,commands}/<skill>/SKILL.md
    try {
      for (const pack of Deno.readDirSync("framework")) {
        if (!pack.isDirectory) continue;
        for (const kind of ["skills", "commands"]) {
          const skillPath =
            `framework/${pack.name}/${kind}/${this.skill}/SKILL.md`;
          try {
            Deno.statSync(skillPath);
            return skillPath;
          } catch { /* not in this location */ }
        }
      }
    } catch { /* framework dir not found */ }
    // Fallback for legacy flat structure
    return `framework/skills/${this.skill}/SKILL.md`;
  }

  setup(_sandboxPath: string): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Base class for scenarios that target a specific agent from the framework.
 * Automatically builds targetAgentPath from the agent ID.
 *
 * Benchmark location: framework/<pack>/agents/<agent-name>/acceptance-tests/<scenario>/mod.ts
 * (co-located next to the flat agent .md file)
 */
export abstract class AcceptanceTestAgentScenario implements BenchmarkScenario {
  abstract id: string;
  abstract name: string;
  abstract agent: string;
  abstract userQuery: string;
  abstract checklist: BenchmarkChecklistItem[];
  abstract agentsTemplateVars: BenchmarkScenario["agentsTemplateVars"];

  /** Default: no setup changes, clean state. Override in subclass. */
  sandboxState: BenchmarkScenario["sandboxState"] = {
    commits: [],
    expectedOutcome: "Agent completes the task successfully",
  };

  get targetAgentPath(): string {
    // Scan pack structure: framework/<pack>/agents/<agent>.md
    try {
      for (const pack of Deno.readDirSync("framework")) {
        if (!pack.isDirectory) continue;
        const agentPath = `framework/${pack.name}/agents/${this.agent}.md`;
        try {
          Deno.statSync(agentPath);
          return agentPath;
        } catch { /* not in this pack */ }
      }
    } catch { /* framework dir not found */ }
    // Fallback for legacy flat structure
    return `framework/agents/${this.agent}.md`;
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
