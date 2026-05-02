import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan (regular implementation task plan, not a
// persistent architectural decision record).
export const PlanAdrTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-adj-1";
  name = "regular task plan (adjacent)";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Plan the next task: extracting the auth middleware into a shared package. GODS format, with DoD.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
