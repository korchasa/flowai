import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

// False-use: "adapt" means a code edit here; nothing about flowai primitives.
export const AdaptTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "adapt-trigger-false-1";
  name = "adapt a function signature";
  skill = "adapt";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome: "Agent routes this request away from adapt",
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

  userQuery =
    'Adapt greet() in greet.ts so it also accepts the greeting word as a second parameter, defaulting to "Hello".';
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `adapt`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `adapt/SKILL.md` or calling the `Skill` tool with `adapt`.",
    critical: true,
  }];
}();
