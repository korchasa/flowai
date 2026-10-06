import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: review the finished uncommitted work, commit it and push
 * it. The branch tracks a bare-repo origin and greet.ts is uncommitted.
 */
export const ReviewCommitPushTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "review-commit-push-trigger-pos-1";
  name = "review, commit and push request";
  skill = "review-commit-push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a review-commit-push request and loads the review-commit-push skill",
  };

  override async setup(sandboxPath: string) {
    const bare = `${sandboxPath}/../review-commit-push-trigger-remote.git`;
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
  }

  userQuery =
    "Review my uncommitted changes, commit them if they hold up, and push the branch.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `review-commit-push` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `review-commit-push`.",
    critical: true,
  }];
}();
