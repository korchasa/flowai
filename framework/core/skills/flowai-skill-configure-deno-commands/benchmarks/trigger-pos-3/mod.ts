import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ConfigureDenoCommandsTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-configure-deno-commands-trigger-pos-3";
  name = "add scripts directory entry points";
  skill = "flowai-skill-configure-deno-commands";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Wire up the scripts/check.ts, scripts/test.ts, and scripts/dev.ts entry points so I can run `deno task check`, `deno task test`, and `deno task dev`.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-configure-deno-commands` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-configure-deno-commands`.",
    critical: true,
  }];
}();
