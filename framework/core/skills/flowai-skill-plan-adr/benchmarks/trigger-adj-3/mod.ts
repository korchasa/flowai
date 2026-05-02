import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (multi-direction research with
// citations to inform a future decision, not the recording of one already made).
export const PlanAdrTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-adj-3";
  name = "deep research before deciding (adjacent)";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Research the latest production-ready Rust web frameworks with citations — I haven't decided which one to use yet.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
