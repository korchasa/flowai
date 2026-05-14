import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ManageGithubTicketsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-manage-github-tickets-trigger-pos-1";
  name = "create new GitHub issue";
  skill = "flowai-manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open a new GitHub issue in our backend repo for the rate-limiter regression, with a clear repro and expected behaviour.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-manage-github-tickets`.",
    critical: true,
  }];
}();
