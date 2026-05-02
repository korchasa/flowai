import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan (plan a single-session task in GODS format,
// not create/manage a GitHub issue).
export const ManageGithubTicketsTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-adj-2";
  name = "single-session task plan (adjacent)";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Plan today's task to add pagination to the orders endpoint — variants, DoD with evidence commands, the whole thing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-manage-github-tickets`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-manage-github-tickets/SKILL.md` or calling the `Skill` tool with `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
