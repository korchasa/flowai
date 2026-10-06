import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// False-use: "update" means a code edit here; nothing about the framework.
export const UpdateTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "update-trigger-false-1";
  name = "update a source file";
  skill = "update";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome: "Agent routes this request away from update",
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
    await runGit(sandboxPath, ["add", "-A"]);
    await runGit(sandboxPath, ["commit", "-m", "feat: add greeting helper"]);
  }

  userQuery = 'Update greet.ts so the greeting says "Hi" instead of "Hello".';
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `update`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `update/SKILL.md` or calling the `Skill` tool with `update`.",
    critical: true,
  }];
}();
