import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review — the user wants the verdict only and forbids the
// commit, so the review-then-commit workflow should stand down.
export const ReviewAndCommitTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-adj-1";
  name = "review-only request (adjacent)";
  skill = "review-and-commit";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome: "Agent routes this request away from review-and-commit",
  };

  override async setup(sandboxPath: string) {
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
    "Review my uncommitted changes and give me a verdict. Don't commit anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `review-and-commit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `review-and-commit/SKILL.md` or calling the `Skill` tool with `review-and-commit`.",
    critical: true,
  }];
}();
