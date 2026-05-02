import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InteractiveTeachingMaterialsTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-pos-2";
  name = "interactive HTML lesson with state diagram";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Produce a self-contained HTML lesson that walks a learner through OAuth flows with a clickable state diagram for each step.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-interactive-teaching-materials` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
