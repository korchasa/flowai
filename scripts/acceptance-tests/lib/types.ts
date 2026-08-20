export interface BenchmarkChecklistItem {
  id: string;
  description: string;
  critical: boolean;
}

export interface BenchmarkScenario {
  id: string;
  name: string;
  targetAgentPath?: string; // Path to the agent/skill .md file
  skill?: string; // Skill identifier (e.g., "plan")

  /** Pack name this scenario belongs to (auto-populated by discovery). */
  pack?: string;

  /**
   * Extra packs to mount in the sandbox beyond `core` + the scenario's own
   * pack. Use for trigger scenarios whose correct adjacent skill lives in a
   * different pack — without it that skill is absent and the agent is forced to
   * over-trigger the skill under test. Example: a `core` devcontainer scenario
   * whose adjacent is the `deno` pack's `deploy` skill sets `["deno"]`.
   */
  extraPacks?: string[];

  /**
   * Host-provided skills that satisfy the deterministic skill-invocation check
   * in place of `skill` (FR-ACCEPT.TRIGGER).
   *
   * The bench isolates `~/.claude/skills/`, but it cannot remove the skills the
   * IDE itself ships: Claude Code's built-in `code-review` is present in every
   * sandbox and is never installed by us (verified — absent from both
   * `<sandbox>/.claude` and `bench-home`). When such a built-in answers the same
   * request as the skill under test, the model splits between the two and the
   * trigger scenario oscillates for a reason that is not the skill's routing.
   *
   * Declaring the built-in here says: this query must reach a capability of this
   * kind, and either one counts. It deliberately WEAKENS the assertion from "our
   * skill won" to "a skill of this kind ran" — set it only where a host built-in
   * genuinely competes, never to quiet a routing bug of our own. Applies to
   * `skill_not_invoked` with the same meaning inverted.
   */
  equivalentSkills?: readonly string[];

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

  /**
   * Positive trigger declared unreachable, with the evidence for it.
   *
   * Some skills describe work the model believes it can already do — write a
   * prompt, tidy a paragraph, run a CLI. A request for that work never reaches
   * the skill catalog at all: the model answers in its first breath, with zero
   * tool calls, and no wording inside a skill it never reads can change that.
   * Measured across three sweeps and nine raw sessions on
   * `engineer-prompts-for-reasoning-trigger-pos-1` on 2026-08-19/20.
   *
   * Setting this records the finding as a DECISION instead of leaving a red
   * test nobody can turn green. The scenario is not executed; the sweep prints
   * it under its own heading and the summary counts it separately, so it stays
   * visible rather than passing quietly like `skip`.
   *
   * Only legitimate on a `trigger-pos-*` scenario, and only with evidence:
   * state the sweeps, the run count and what the raw sessions showed.
   * `check-trigger-coverage.ts` still requires the file to exist, so coverage
   * bookkeeping is unchanged. Do NOT use it to retire a scenario that is merely
   * failing — a routing miss that a description could fix is a defect, not this.
   */
  noPositiveTrigger?: string;
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
