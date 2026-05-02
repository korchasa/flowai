import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: reviewing the team's existing task files for quality is critique,
// not authoring a new one in GODS format.
export const WriteGodsTasksTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-false-3";
  name = "audit existing task files (false-use)";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Skim through our last month of task files and tell me which ones lack proper DoD evidence — just point them out, don't rewrite anything.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
