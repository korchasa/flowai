import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that flowai-update skill uses `flowai update` (the subcommand)
 * for CLI self-update in step 1, not `flowai --version` with manual
 * text-parsing.
 *
 * Mock `flowai update` returns "Already up to date." — agent must proceed
 * to sync step without error.
 */
export const FlowUpdateCommandBench = new class extends AcceptanceTestScenario {
  id = "flowai-update-update-command";
  name =
    "Uses `flowai update` subcommand (not `flowai --version`) for self-update";
  skill = "flowai-update";
  stepTimeoutMs = 300_000;

  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Mock flowai: static response — `flowai update` returns "Already up to date."
  // The skill must instruct agent to use `flowai update` (not `flowai --version`).
  mocks: Record<string, string> = {
    flowai: "Already up to date (0.5.0).",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial commit",
        files: [".flowai.yaml", ".claude/skills/"],
      },
    ],
    expectedOutcome:
      "Agent uses `flowai update` subcommand (not `flowai --version`) for CLI self-update check",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      join(sandboxPath, ".flowai.yaml"),
      "version: 1\nides:\n  - claude\n",
    );

    await Deno.mkdir(join(sandboxPath, ".claude", "skills"), {
      recursive: true,
    });

    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);
  }

  userQuery = "/flowai-update";

  checklist = [
    {
      id: "used_update_subcommand",
      description:
        "Did the agent run `flowai update` (the subcommand) rather than `flowai --version` for the CLI self-update step?",
      critical: true,
    },
    {
      id: "not_used_version_flag",
      description:
        "Did the agent avoid using `flowai --version` as the update mechanism?",
      critical: true,
    },
    {
      id: "proceeded_after_up_to_date",
      description:
        "Did the agent proceed to the next step (sync) after receiving 'Already up to date' output?",
      critical: false,
    },
  ];
}();
