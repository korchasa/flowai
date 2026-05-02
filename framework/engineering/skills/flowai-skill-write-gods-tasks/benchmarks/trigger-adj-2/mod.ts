import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-epic (multi-session/multi-phase epic plan, not
// a single GODS task).
export const WriteGodsTasksTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-adj-2";
  name = "multi-phase epic (adjacent)";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Lay out a multi-phase epic for the search-relevance overhaul — dependency-ordered phases with atomic tasks per phase and status tracking.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
