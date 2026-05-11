import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that flowai-adapt adapts skills to project specifics.
 *
 * Scenario:
 * 1. Python project with pytest/ruff stack (visible in AGENTS.md)
 * 2. flowai-commit skill installed with generic Deno examples
 * 3. User runs /flowai-adapt --skills
 * 4. Agent should detect generic commands, adapt to Python/pytest via subagent
 *
 * The skill has been synced but never adapted (first-time adaptation).
 * Agent must adapt generic Deno examples to Python-specific commands.
 */
export const FlowAdaptSkillsBasicBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-adapt-skills-basic";
  name = "Adapt generic skills to Python project specifics";
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
        message: "Initial sync with generic skills",
        files: [
          ".flowai.yaml",
          ".claude/skills/flowai-commit/SKILL.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent adapts flowai-commit skill: replaces deno test/lint with poetry run pytest/ruff, shows diff, asks confirmation",
  };

  override async setup(sandboxPath: string) {
    // Create .flowai.yaml
    await Deno.writeTextFile(
      join(sandboxPath, ".flowai.yaml"),
      'version: "1.1"\nides:\n  - claude\npacks:\n  - core\n',
    );

    // Create .claude/skills/flowai-commit/ with generic (upstream) version
    const skillDir = join(sandboxPath, ".claude", "skills", "flowai-commit");
    await Deno.mkdir(skillDir, { recursive: true });

    const genericSkill = `---
name: flowai-commit
description: Commit workflow
---

# Task: Commit Changes

## Rules
1. Run tests before committing: \`deno test\`
2. Run linter: \`deno lint\`
3. Write conventional commit messages

## Steps
1. Check test results: \`deno test\`
2. Run formatter: \`deno fmt\`
3. Stage changes
4. Write commit message
`;
    await Deno.writeTextFile(join(skillDir, "SKILL.md"), genericSkill);

    // Commit as baseline (initial sync, never adapted)
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Initial sync with generic skills",
    ]);

    // Working tree = same as HEAD (no upstream changes, just needs adaptation)
    // This simulates first-time adaptation after initial install
  }

  userQuery = "/flowai-adapt --skills";

  checklist = [
    {
      id: "scanned_skills",
      description:
        "Did the agent scan installed skills in .claude/skills/ to find flowai-* directories?",
      critical: true,
    },
    {
      id: "launched_adapter_subagent",
      description:
        "Did the agent launch a flowai-skill-adapter subagent (or similar adaptation agent) for the skill?",
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
        "Does the adapted skill contain Python-specific commands (poetry run pytest, ruff) instead of generic Deno commands (deno test, deno lint)?",
      critical: true,
    },
    {
      id: "asked_confirmation",
      description:
        "Did the agent ask for user confirmation before finalizing the adaptation?",
      critical: false,
    },
    {
      id: "produced_summary",
      description: "Did the agent produce a summary of what was adapted?",
      critical: false,
    },
  ];
}();
