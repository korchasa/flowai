import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-deno-cli (local CLI invocations — running, testing,
// formatting — not cloud deploy concerns).
export const DenoDeployTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-deno-deploy-trigger-adj-1";
  name = "local deno run (adjacent)";
  skill = "flowai-skill-deno-deploy";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Start the server on my laptop with the right network and read permissions so I can poke at it in the browser.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-deploy`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-deploy/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-deploy`.",
    critical: true,
  }];
}();
