import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-gods-tasks (write a GODS-format task file
// in documents/tasks/, not create or update a GitHub issue).
export const ManageGithubTicketsTriggerAdj1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-adj-1";
  name = "local GODS task file (adjacent)";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Draft a local task file under documents/tasks/ in GODS format for the upcoming cache-eviction refactor — don't push it to GitHub.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-manage-github-tickets`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-manage-github-tickets/SKILL.md` or calling the `Skill` tool with `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
