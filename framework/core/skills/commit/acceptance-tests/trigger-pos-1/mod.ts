import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Positive trigger: a plain request to commit the working tree. The change is
 * real and uncommitted, so the premise of the query holds.
 */
export const CommitTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "commit-trigger-pos-1";
  name = "plain commit request";
  skill = "commit";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome:
      "Agent recognises a commit request and loads the commit skill",
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

  userQuery = "Commit my current changes.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `commit` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `commit`.",
    critical: true,
  }];
}();
