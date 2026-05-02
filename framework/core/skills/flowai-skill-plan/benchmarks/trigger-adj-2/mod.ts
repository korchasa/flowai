import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan-adr (record an architectural decision in
// MADR style, not a regular implementation plan).
export const PlanTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-plan-trigger-adj-2";
  name = "record an ADR (adjacent)";
  skill = "flowai-skill-plan";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Capture our rationale for picking SQLite over PostgreSQL for the local cache as an architectural decision record.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-plan`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-plan/SKILL.md` or calling the `Skill` tool with `flowai-skill-plan`.",
    critical: true,
  }];
}();
