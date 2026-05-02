import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deno-deploy (deploying Deno code to Deno Deploy,
// managing cloud envs — different domain than local task wiring).
export const ConfigureDenoCommandsTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-adj-2";
  name = "deploy to Deno Deploy (adjacent)";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me deploy this project to Deno Deploy and set up the production environment correctly.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
