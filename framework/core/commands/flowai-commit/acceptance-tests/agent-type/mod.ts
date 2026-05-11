import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";
import { join } from "@std/path";

export const CommitAgentTypeBench = new class extends AcceptanceTestScenario {
  id = "flowai-commit-agent-type";
  name = "Agent Type for AI Config Files";
  skill = "flowai-commit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    untracked: [".claude/skills/my-skill/SKILL.md"],
    expectedOutcome:
      "Agent commits AI config file with 'agent:' type in conventional commit message",
  };

  override async setup(sandboxPath: string) {
    // Create an AI agent/skill config file as untracked
    const skillDir = join(sandboxPath, ".claude", "skills", "my-skill");
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(
      join(skillDir, "SKILL.md"),
      [
        "---",
        "name: my-skill",
        "description: A custom skill for testing",
        "---",
        "",
        "# My Skill",
        "",
        "This skill helps with testing.",
        "",
      ].join("\n"),
    );

    // Remove from index if it was committed by runner
    try {
      await runGit(sandboxPath, [
        "rm",
        "--cached",
        "-r",
        ".claude/skills/my-skill",
      ]);
      await runGit(sandboxPath, [
        "commit",
        "-m",
        "Remove skill from tracking",
      ]);
    } catch {
      // File might not be tracked yet, that's fine
    }
  }

  userQuery =
    "/flowai-commit I created a new AI skill for the project. Commit this.";

  checklist = [
    {
      id: "file_committed",
      description: "Is the SKILL.md file present in the last commit?",
      critical: true,
    },
    {
      id: "agent_type_used",
      description:
        "Does the commit message use 'agent:' type prefix (for AI agent/skill config files)?",
      critical: true,
    },
    {
      id: "conventional_commits",
      description: "Does the commit message follow Conventional Commits?",
      critical: true,
    },
    {
      id: "clean_status",
      description: "Is the final git status clean?",
      critical: true,
    },
  ];
}();
