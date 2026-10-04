import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Positive trigger: review the uncommitted change, then commit it only if the
 * review lets it through. The change is real and uncommitted.
 */
export const ReviewAndCommitTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "review-and-commit-trigger-pos-1";
  name = "review then commit request";
  skill = "review-and-commit";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome:
      "Agent recognises a review-then-commit request and loads the review-and-commit skill",
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
    "Review my uncommitted changes and, if they hold up, commit them.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `review-and-commit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `review-and-commit`.",
    critical: true,
  }];
}();
