import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ManageGithubTicketsTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-pos-3";
  name = "update issue body and labels";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Update issue #482 in our org repo: rewrite the body so the goal and DoD are clear, and add the `area:auth` label.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
