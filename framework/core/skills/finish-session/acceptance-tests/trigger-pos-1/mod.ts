import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive trigger: the user asks to close the session — goals, commit, push, archive.
export const FinishSessionTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "finish-session-trigger-pos-1";
  name = "wrap the session up";
  skill = "finish-session";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["greet.ts"],
    expectedOutcome:
      "Agent recognises a session-finish request and loads finish-session",
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
    "I asked for a greeting helper in greet.ts and it is written. We are done here: make sure everything I asked for is delivered, commit it, push it and archive this session.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `finish-session` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `finish-session`.",
    critical: true,
  }];
}();
