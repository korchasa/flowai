import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const ManageGithubTicketsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "manage-github-tickets-trigger-pos-1";
  name = "create new GitHub issue";
  skill = "manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  noPositiveTrigger =
    "Measured 2026-08-20, 3 runs, every raw session with ZERO tool calls in 18 s: the agent writes the issue text straight into its reply rather than reaching for the skill. Same shape as engineer-prompts-for-reasoning-trigger-pos-1 — a request the model believes it can answer unaided never reaches the catalog, so no description wording can win it.";

  userQuery =
    "Open a new GitHub issue in our backend repo for the rate-limiter regression, with a clear repro and expected behaviour.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `manage-github-tickets`.",
    critical: true,
  }];
}();
