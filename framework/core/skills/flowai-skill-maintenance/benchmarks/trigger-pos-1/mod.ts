import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MaintenanceTriggerPos1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-maintenance-trigger-pos-1";
  name = "explicit health audit";
  skill = "flowai-skill-maintenance";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a full project health audit on this repo and walk me through the issues one by one — I want to approve fixes interactively.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-maintenance` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-maintenance`.",
    critical: true,
  }];
}();
