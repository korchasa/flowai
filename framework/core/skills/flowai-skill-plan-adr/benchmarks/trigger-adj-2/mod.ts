import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-dep (Development Enhancement Proposal —
// proposing a future improvement, not recording a decision already made).
export const PlanAdrTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-adr-trigger-adj-2";
  name = "write a DEP (adjacent)";
  skill = "flowai-skill-plan-adr";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Write a development enhancement proposal for adding distributed tracing across all services. We haven't decided yet — this is the proposal stage.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan-adr`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan-adr/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan-adr`.",
    critical: true,
  }];
}();
