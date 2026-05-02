import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InteractiveTeachingMaterialsTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-interactive-teaching-materials-trigger-pos-3";
  name = "playable artifact for onboarding";
  skill = "flowai-skill-interactive-teaching-materials";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Make an artifact our new hires can play with in a browser to learn how our request lifecycle moves through middleware, with each stage clickable.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-interactive-teaching-materials` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-interactive-teaching-materials`.",
    critical: true,
  }];
}();
