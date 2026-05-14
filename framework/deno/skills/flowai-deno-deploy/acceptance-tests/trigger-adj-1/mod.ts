import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-deno-cli (local CLI invocations — running, testing,
// formatting — not cloud deploy concerns).
export const DenoDeployTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-deno-deploy-trigger-adj-1";
  name = "local deno run (adjacent)";
  skill = "flowai-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Start the server on my laptop with the right network and read permissions so I can poke at it in the browser.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-deno-deploy`.",
    critical: true,
  }];
}();
