import { join } from "@std/path";
import { BenchmarkSkillScenario } from "@bench/types.ts";
import { runGit } from "@bench/utils.ts";

/**
 * Tests that flowai-adapt adapts ALL primitive types in one run.
 *
 * Scenario:
 * 1. Go project with go test/golangci-lint stack (visible in AGENTS.md)
 * 2. Generic skill + agent installed with Deno references
 * 3. AGENTS.md artifact present (scaffolded from template)
 * 4. User runs /flowai-adapt (no flags — adapt everything)
 * 5. Agent should adapt skills, agents, verify AGENTS.md, and produce summary
 */
export const FlowAdaptAllBench = new class extends BenchmarkSkillScenario {
  id = "flowai-adapt-all";
  name = "Adapt all primitives (skills + agents + assets) for Go project";
  skill = "flowai-adapt";
  stepTimeoutMs = 300_000;

  maxSteps = 35;

  agentsTemplateVars = {
    PROJECT_NAME: "MyGoService",
    TOOLING_STACK: "- Go 1.22, go test, golangci-lint, make",
    ARCHITECTURE:
      "- `cmd/` — entrypoints\n- `internal/` — application logic\n- `go.mod` — module config\n- `Makefile` — build commands",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial sync with generic primitives",
        files: [
          ".flowai.yaml",
          ".claude/skills/flowai-commit/SKILL.md",
          ".claude/agents/flowai-console-expert.md",
          "AGENTS.md",
        ],
      },
    ],
    expectedOutcome:
      "Agent adapts both skill and agent to Go-specific commands (go test, golangci-lint), verifies AGENTS.md artifact, produces summary",
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

    // Create AGENTS.md artifact (scaffolded, with project-specific content)
    const agentsMd = `# Core Project Rules
- Follow your assigned role strictly.
- Verify every change by running appropriate tests or scripts.

---

## Project Information
- Project Name: MyGoService

## Project tooling Stack
- Go 1.22, go test, golangci-lint, make

## Architecture
- \`cmd/\` — entrypoints
- \`internal/\` — application logic
- \`go.mod\` — module config
- \`Makefile\` — build commands
`;
    await Deno.writeTextFile(join(sandboxPath, "AGENTS.md"), agentsMd);

    // Commit as baseline (initial sync, never adapted)
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Initial sync with generic primitives",
    ]);
  }

  userQuery = "/flowai-adapt";

  checklist = [
    {
      id: "adapted_skills",
      description:
        "Did the agent adapt skills (replace deno test/lint/fmt with Go-specific commands like go test, golangci-lint)?",
      critical: true,
    },
    {
      id: "adapted_agents",
      description:
        "Did the agent adapt agents (replace generic Deno references with Go-specific ones)?",
      critical: true,
    },
    {
      id: "verified_assets",
      description:
        "Did the agent verify or check AGENTS.md artifact against the template?",
      critical: true,
    },
    {
      id: "showed_diffs",
      description:
        "Did the agent show diffs or before/after comparisons for adapted resources?",
      critical: true,
    },
    {
      id: "produced_summary",
      description:
        "Did the agent produce a final summary reporting how many skills, agents, and assets were processed?",
      critical: true,
    },
    {
      id: "asked_confirmation",
      description:
        "Did the agent ask for user confirmation before finalizing adaptations?",
      critical: false,
    },
  ];
}();
