import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ConfigureDenoCommandsTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-pos-2";
  name = "update existing deno task interface";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our deno.json tasks are out of sync with the standard interface. Bring `check` and `test` in line with the project conventions.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-configure-deno-commands` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
