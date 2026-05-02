import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ManageGithubTicketsTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-pos-2";
  name = "triage existing issues";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me triage the open issues on our repo — relabel, close stale ones, and consolidate the duplicates about the login bug.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
