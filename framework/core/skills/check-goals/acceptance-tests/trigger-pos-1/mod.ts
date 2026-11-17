import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive trigger: the user asks whether what they asked for in this session got done.
export const CheckGoalsTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "check-goals-trigger-pos-1";
  name = "asks whether the session delivered what was asked";
  skill = "check-goals";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome:
      "Agent recognises a goal-check request and loads check-goals",
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
    "I asked you to add a greeting helper in greet.ts. Before I close this session, check whether everything I asked for here actually got done.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `check-goals` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `check-goals`.",
    critical: true,
  }];
}();
