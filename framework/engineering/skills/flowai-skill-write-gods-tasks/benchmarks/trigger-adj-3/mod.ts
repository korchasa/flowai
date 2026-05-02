import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-manage-github-tickets (the user wants to publish
// tasks as GitHub issues, not author a local GODS task file).
export const WriteGodsTasksTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-write-gods-tasks-trigger-adj-3";
  name = "publish tasks as GitHub issues (adjacent)";
  skill = "flowai-skill-write-gods-tasks";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Take these three task ideas and open them as separate GitHub issues in our backend repo, each with proper labels and assignees.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-gods-tasks`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-gods-tasks/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-gods-tasks`.",
    critical: true,
  }];
}();
