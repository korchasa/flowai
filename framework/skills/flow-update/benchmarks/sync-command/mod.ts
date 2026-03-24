import { join } from "@std/path";
import { BenchmarkSkillScenario } from "../../../../../scripts/benchmarks/lib/types.ts";
import {
  runGit,
  setupGitRepo,
} from "../../../../../scripts/benchmarks/lib/utils.ts";

/**
 * Tests that flow-update skill instructs the agent to use `flowai sync`
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
  extends BenchmarkSkillScenario {
  id = "flow-update-sync-command";
  name = "Uses `flowai sync` subcommand (not bare `flowai`) for syncing";
  skill = "flow-update";

  fixturePath = "framework/skills/flow-update/benchmarks/sync-command/fixture";

  maxSteps = 15;

  agentsMarkdown = `# TestProject

## Project tooling Stack
- TypeScript, Deno

## TDD FLOW
1. RED
2. GREEN
3. REFACTOR
4. CHECK
`;

  // Mock flowai: bare command prints IDE message, `sync` subcommand succeeds
  override mocks: Record<string, string> = {
    flowai: `#!/bin/bash
if [ "$1" = "sync" ]; then
  echo "Sync plan:"
  echo "  IDEs: claude"
  echo "  Skills: all"
  echo "  Agents: all"
  echo ""
  echo "Sync complete:"
  echo "  Written: 3"
  echo "  Unchanged: 86"
  exit 0
elif [ "$1" = "--version" ]; then
  echo "flowai 0.3.5"
  exit 0
else
  echo "IDE context detected. Run \\\`flowai sync\\\` explicitly or use \\\`/flow-update\\\` skill."
  exit 0
fi
`,
  };

  override async setup(sandboxPath: string) {
    await setupGitRepo(sandboxPath);

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

  userQuery = "/flow-update";

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
      id: "no_ide_context_error",
      description:
        "Did the agent NOT get stuck on 'IDE context detected' message (i.e., did not use bare `flowai`)?",
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
