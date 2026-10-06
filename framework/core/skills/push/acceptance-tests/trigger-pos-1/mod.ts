import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: a plain request to push. The branch tracks a bare-repo
 * origin and is one commit ahead, so the premise of the query holds.
 */
export const PushTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "push-trigger-pos-1";
  name = "plain push request";
  skill = "push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome: "Agent recognises a push request and loads the push skill",
  };

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../push-trigger-remote.git`;
    await new Deno.Command("git", {
      args: ["init", "--bare", bare],
      stdout: "piped",
      stderr: "piped",
    }).output();
    await runGit(sandboxPath, ["remote", "add", "origin", bare]);
    await runGit(sandboxPath, ["push", "-u", "origin", "main"]);
    await runGit(sandboxPath, ["checkout", "-b", "feature/greet"]);
    await runGit(sandboxPath, ["push", "-u", "origin", "feature/greet"]);
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

  userQuery = "Push my branch to the remote.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `push` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `push`.",
    critical: true,
  }];
}();
