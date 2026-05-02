import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ManageGithubTicketsTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-manage-github-tickets-trigger-pos-1";
  name = "create new GitHub issue";
  skill = "flowai-skill-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open a new GitHub issue in our backend repo for the rate-limiter regression, with a clear repro and expected behaviour.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-manage-github-tickets`.",
    critical: true,
  }];
}();
