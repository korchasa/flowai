import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review-and-commit — the user asks for a review that gates the
// commit, so the plain commit primitive should stand down.
export const CommitTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-adj-1";
  name = "review-then-commit request (adjacent)";
  skill = "commit";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome: "Agent routes this request away from commit",
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
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `commit`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `commit/SKILL.md` or calling the `Skill` tool with `commit`.",
    critical: true,
  }];
}();
