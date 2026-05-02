import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: domain vocabulary (deno task) but the user wants a one-off bash
// alias, not configuration of the standard interface in deno.json + scripts/.
export const ConfigureDenoCommandsTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-false-3";
  name = "shell alias instead of task";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Add a bash alias to my .zshrc so I can type `dt` instead of `deno task test` every time.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-configure-deno-commands`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-configure-deno-commands/SKILL.md` or calling the `Skill` tool with `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
