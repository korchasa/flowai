import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: configuring a GitHub Actions workflow file is repo automation,
// not creating or managing GitHub issues.
export const ManageGithubTicketsTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-false-3";
  name = "configure GitHub Actions (false-use)";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up a GitHub Actions workflow that runs our test suite on every push and uploads coverage to Codecov.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-manage-github-tickets`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-manage-github-tickets/SKILL.md` or calling the `Skill` tool with `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
