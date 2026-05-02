import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-maintenance (lead-engineer audit of project
// state, not extraction of patterns from session transcripts).
export const ReflectByHistoryTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-adj-3";
  name = "broad project audit (adjacent)";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Run a project health audit across architecture, deps, tests, and docs and walk me through findings interactively.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
