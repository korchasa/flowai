import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: casual "how would you approach X?" question, explicitly
// excluded by the description as ad-hoc design discussion.
export const PlanTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-false-2";
  name = "casual how-would-you-approach";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How would you approach implementing optimistic UI updates in this React app? Just curious about your thoughts.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
