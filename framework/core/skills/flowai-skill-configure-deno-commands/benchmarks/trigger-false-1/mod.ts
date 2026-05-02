import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the standard deno commands work, not a
// request to configure them in this project.
export const ConfigureDenoCommandsTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-false-1";
  name = "meta question about the convention";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does the flowai standard deno command interface look like in general? I'm just researching conventions.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
