import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research (multi-direction web research
// for an open question, not a controlled bug investigation in our codebase).
export const InvestigateTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-adj-3";
  name = "external research question (adjacent)";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Research the trade-offs between PostgreSQL row-level security and application-layer authorization for multi-tenant SaaS, with citations.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-investigate`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-investigate/SKILL.md` or calling the `Skill` tool with `flowai-skill-investigate`.",
    critical: true,
  }];
}();
