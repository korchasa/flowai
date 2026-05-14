import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: setting up a Node.js script — different runtime, not Deno.
export const DenoCliTriggerFalse1 = new class extends AcceptanceTestScenario {
  id = "flowai-deno-cli-trigger-false-1";
  name = "Node.js script setup (wrong runtime)";
  skill = "flowai-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add an `npm run lint` script to package.json that runs ESLint on src/ before each commit.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-deno-cli`.",
    critical: true,
  }];
}();
