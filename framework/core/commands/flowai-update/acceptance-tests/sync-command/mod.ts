import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Tests that flowai-update skill instructs the agent to use `flowai sync`
 * (the subcommand), not bare `flowai`, especially in IDE context where
 * the bare command is blocked.
 *
 * The scenario provides a mock `flowai` that:
 * - `flowai sync ...` → succeeds with "Sync complete" output
 * - `flowai` (bare) → fails with "IDE context detected" message
 *
 * The agent must use `flowai sync` (subcommand) to pass.
 */
export const FlowUpdateSyncCommandBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-update-sync-command";
  name = "Uses `flowai sync` subcommand (not bare `flowai`) for syncing";
  skill = "flowai-update";
  stepTimeoutMs = 300_000;

  maxSteps = 15;

  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  // Mock flowai: static response (hooks mechanism returns same reason for all calls).
  // The skill itself must instruct the agent to use `flowai sync` subcommand.
  mocks: Record<string, string> = {
    flowai:
      "Sync complete: Written: 3, Unchanged: 86. IDEs: claude. Skills: all. Agents: all.",
  };

  override sandboxState = {
    commits: [
      {
        message: "Initial commit",
        files: [".flowai.yaml", ".claude/skills/"],
      },
    ],
    expectedOutcome:
      "Agent uses `flowai sync` subcommand (not bare `flowai`) to sync framework",
  };

  override async setup(sandboxPath: string) {
    // Create .flowai.yaml
    await Deno.writeTextFile(
      join(sandboxPath, ".flowai.yaml"),
      "version: 1\nides:\n  - claude\n",
    );

    // Create .claude/skills/ dir to simulate IDE config
    await Deno.mkdir(join(sandboxPath, ".claude", "skills"), {
      recursive: true,
    });

    // Commit baseline
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "Initial commit"]);
  }

  userQuery = "/flowai-update";

  checklist = [
    {
      id: "used_sync_subcommand",
      description:
        "Did the agent run `flowai sync` (the subcommand) rather than bare `flowai` or `flowai -y`?",
      critical: true,
    },
    {
      id: "sync_succeeded",
      description:
        "Did the sync complete successfully (agent received 'Sync complete' output)?",
      critical: true,
    },
    {
      id: "detected_changes_or_no_changes",
      description:
        "Did the agent proceed to check for changes (git status/diff) or report 'up to date' after sync?",
      critical: false,
    },
  ];
}();
