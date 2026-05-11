import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-skill-deno-deploy (cloud deploy and deployctl,
// not local CLI invocation).
export const DenoCliTriggerAdj1 = new class extends AcceptanceTestScenario {
  id = "flowai-skill-deno-cli-trigger-adj-1";
  name = "deploy to deno deploy (adjacent)";
  skill = "flowai-skill-deno-cli";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Push this app to the cloud so I can give my team a preview URL. We're already on Deno's hosting platform.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deno-cli`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deno-cli/SKILL.md` or calling the `Skill` tool with `flowai-skill-deno-cli`.",
    critical: true,
  }];
}();
