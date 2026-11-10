import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: review-commit-push — a code review gates the commit, and nothing is said about closing the session.
export const FinishSessionTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "finish-session-trigger-adj-1";
  name = "review then commit then push (adjacent)";
  skill = "finish-session";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome: "Agent routes this request away from finish-session",
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
    "Look over my uncommitted work first; if it is sound, commit it and push the branch.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `finish-session`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `finish-session/SKILL.md` or calling the `Skill` tool with `finish-session`.",
    critical: true,
  }];
}();
