import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerSkillTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-pos-2";
  name = "SKILL.md format question";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What goes into a SKILL.md file and how should I structure the description so the agent picks it up at the right moment?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-skill` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
