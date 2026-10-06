import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// Adjacent skill: review-commit-push — the work is uncommitted and the user
// wants a review to gate the commit before the push, so plain push stands down.
export const PushTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "push-trigger-adj-1";
  name = "review then commit then push request (adjacent)";
  skill = "push";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome: "Agent routes this request away from push",
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
  }

  userQuery =
    "Look over my uncommitted work first; if it is sound, commit it and push the branch.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `push`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `push/SKILL.md` or calling the `Skill` tool with `push`.",
    critical: true,
  }];
}();
