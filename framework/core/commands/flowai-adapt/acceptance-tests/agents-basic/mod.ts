import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that flowai-adapt adapts agents to project specifics.
 *
 * Scenario:
 * 1. Python project with pytest/ruff stack (visible in AGENTS.md)
 * 2. flowai-diff-specialist agent installed with generic Deno references
 * 3. User runs /flowai-adapt --agents
 * 4. Agent should detect generic references, adapt via flowai-agent-adapter subagent
 *
 * The agent has been synced but never adapted (first-time adaptation).
 * Agent must adapt generic Deno examples in the body to Python-specific references.
 */
export const FlowAdaptAgentsBasicBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-agents-basic";
  name = "Adapt generic agents to Python project specifics";
  skill = "flowai-adapt";
  stepTimeoutMs = 300_000;

  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "MyPythonApp",
    TOOLING_STACK: "- Python 3.12, pytest, ruff, poetry",
    ARCHITECTURE:
      "- `src/` — application code\n- `tests/` — pytest test files\n- `pyproject.toml` — project config",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial sync with generic agents",
        files: [
          ".flowai.yaml",
          ".claude/agents/flowai-console-expert.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent adapts flowai-console-expert agent: replaces generic Deno references with Python-specific ones, shows diff, asks confirmation",
  };

  override async setup(sandboxPath: string) {
    // Create .flowai.yaml
    await Deno.writeTextFile(
      join(sandboxPath, ".flowai.yaml"),
      'version: "1.1"\nides:\n  - claude\npacks:\n  - core\n',
    );

    // Create .claude/agents/ with generic (upstream) agent
    const agentsDir = join(sandboxPath, ".claude", "agents");
    await Deno.mkdir(agentsDir, { recursive: true });

    const genericAgent = `---
name: flowai-console-expert
description: Expert in executing complex console tasks and commands.
tools: Read, Grep, Glob, Bash
mode: subagent
model: fast
---

You are a console expert. Execute complex console tasks without modifying code.

# Capabilities

- Run project checks: \`deno task check\`
- Run tests: \`deno test\`
- Run linter: \`deno lint\`
- Run formatter: \`deno fmt\`
- Analyze logs and outputs

# Rules

- Use \`deno\` for TypeScript/JavaScript projects
- Prefer non-destructive commands
- Report results clearly
`;
    await Deno.writeTextFile(
      join(agentsDir, "flowai-console-expert.md"),
      genericAgent,
    );

    // Commit as baseline (initial sync, never adapted)
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Initial sync with generic agents",
    ]);

    // Working tree = same as HEAD (no upstream changes, just needs adaptation)
  }

  userQuery = "/flowai-adapt --agents";

  checklist = [
    {
      id: "scanned_agents",
      description:
        "Did the agent scan installed agents in .claude/agents/ to find flowai-* files?",
      critical: true,
    },
    {
      id: "launched_agent_adapter",
      description:
        "Did the agent launch a flowai-agent-adapter subagent (or similar adaptation agent) for the agent file?",
      critical: true,
    },
    {
      id: "showed_diff",
      description:
        "Did the agent show the adaptation diff or before/after comparison to the user?",
      critical: true,
    },
    {
      id: "adapted_to_python",
      description:
        "Does the adapted agent contain Python-specific references (pytest, ruff, poetry) instead of generic Deno commands (deno test, deno lint, deno fmt)?",
      critical: true,
    },
    {
      id: "preserved_frontmatter",
      description:
        "Was the agent's YAML frontmatter preserved as-is (name, description, tools, model fields unchanged)?",
      critical: true,
    },
    {
      id: "asked_confirmation",
      description:
        "Did the agent ask for user confirmation before finalizing the adaptation?",
      critical: false,
    },
  ];
}();
