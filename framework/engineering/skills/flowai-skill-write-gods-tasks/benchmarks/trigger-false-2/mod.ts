import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: implementing the task directly is execution, not authoring a
// task description.
export const WriteGodsTasksTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-false-2";
  name = "implement the task directly (false-use)";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Don't write anything down — just go and add the missing index on orders.created_at and run the migration locally to confirm it works.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
