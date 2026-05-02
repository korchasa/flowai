import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match (deno.json) but the user is asking about
// dependency management, not the standard command interface.
export const ConfigureDenoCommandsTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-false-2";
  name = "explain deno.json imports field";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain what the imports field in deno.json does and how I should pin a version of zod there.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
