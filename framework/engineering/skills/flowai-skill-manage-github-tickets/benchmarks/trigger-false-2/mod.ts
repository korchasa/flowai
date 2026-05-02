import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: opening a pull request / managing PR review is GitHub work but a
// different intent — not creating or managing issues.
export const ManageGithubTicketsTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-false-2";
  name = "open a pull request (false-use)";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Push my current branch and open a pull request against main with a summary of the change and a test plan.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-manage-github-tickets`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-manage-github-tickets/SKILL.md` or calling the `Skill` tool with `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
