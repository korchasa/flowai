import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The query carries the repository and the whole body of the issue. It did not
 * until 2026-08-20: the old wording asked for an issue "in our backend repo for
 * the rate-limiter regression" and named neither the repo nor the regression, so
 * all three runs ended `blocked`, asking for "GitHub org/repo, regression
 * description, repro steps, expected behavior". A scenario that stalls on
 * missing input measures nothing about the skill's description — and this one
 * was briefly recorded as an unreachable positive trigger because its tool-call
 * count was zero, read off the summary table without opening the session.
 *
 * With the material supplied the scenario finally measures something, and what
 * it measures is red: 0/3 on 2026-08-20, exit 0 every run. The agent drafts the
 * issue body itself and stops at `blocked` asking for confirmation to post it,
 * never opening the skill that defines the GODS issue format. Still open.
 */
export const ManageGithubTicketsTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "manage-github-tickets-trigger-pos-1";
  name = "create new GitHub issue";
  skill = "manage-github-tickets";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };

  userQuery =
    "Open a GitHub issue in acme/backend: since the 2.4 deploy the rate limiter rejects valid traffic. Repro — send 5 requests per second to /api/search with a valid key, and the fourth comes back 429. Expected — no 429 below 10 requests per second.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `manage-github-tickets` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `manage-github-tickets`.",
    critical: true,
  }];
}();
