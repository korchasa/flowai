import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InteractiveTeachingMaterialsTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-pos-1";
  name = "explorable tutorial request";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Can you build me a clickable, explorable tutorial about TCP handshake states that I can open in the browser and play with?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-interactive-teaching-materials` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
