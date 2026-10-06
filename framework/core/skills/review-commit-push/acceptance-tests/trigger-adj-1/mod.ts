import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Adjacent skill: review-and-commit — the user wants the review to gate the
// commit but explicitly keeps the push for later.
export const ReviewCommitPushTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "review-commit-push-trigger-adj-1";
  name = "review and commit without push (adjacent)";
  skill = "review-commit-push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome: "Agent routes this request away from review-commit-push",
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
    "Review my uncommitted changes and commit them if they hold up. Do not push — I will push later myself.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-commit-push`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `review-commit-push/SKILL.md` or calling the `Skill` tool with `review-commit-push`.",
    critical: true,
  }];
}();
