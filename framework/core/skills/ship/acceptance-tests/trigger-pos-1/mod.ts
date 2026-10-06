import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: a new feature with no plan yet, to be planned,
 * implemented, reviewed, committed and pushed in one run.
 */
export const ShipTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "ship-trigger-pos-1";
  name = "take a new feature all the way";
  skill = "ship";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a full plan-to-push request and loads the ship skill",
  };

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../ship-trigger-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/farewell"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/farewell"]);
    await Deno.writeTextFile(
      `${sandboxPath}/greet.ts`,
      `/** Builds a greeting for the given name. */
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`,
    );
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add greeting helper"]);
  }

  userQuery =
    "Add a `farewell(name)` helper next to `greet()` in greet.ts and take it all the way: plan it, implement it, review it, commit and push.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `ship` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `ship`.",
    critical: true,
  }];
}();
