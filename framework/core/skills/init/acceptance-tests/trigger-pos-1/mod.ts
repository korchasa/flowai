import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

/**
 * Positive trigger: an existing Deno codebase that was never set up for
 * flowai; the user asks for the agent instructions and the docs skeleton.
 */
export const InitTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "init-trigger-pos-1";
  name = "initialise a codebase for flowai";
  skill = "init";
  agentsTemplateVars = {
    PROJECT_NAME: "Sandbox",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent recognises a project-initialisation request and loads the init skill",
  };

  override async setup(sandboxPath: string) {
    await Deno.writeTextFile(
      `${sandboxPath}/deno.json`,
      `{ "tasks": { "check": "deno fmt --check && deno lint && deno test" } }\n`,
    );
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
    "This repository has never been set up for flowai. Initialise it: write the agent instructions and the documentation skeleton for this codebase.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `init` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `init`.",
    critical: true,
  }];
}();
