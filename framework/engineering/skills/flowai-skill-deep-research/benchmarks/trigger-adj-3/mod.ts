import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan-adr (record an architectural decision — the
// user has already decided and wants persistence, not new research synthesis).
export const DeepResearchTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-adj-3";
  name = "record architectural decision (adjacent)";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "We just decided to switch from Postgres to SQLite for the embedded test harness — capture that decision as an ADR with the rejected alternatives.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deep-research/SKILL.md` or calling the `Skill` tool with `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
