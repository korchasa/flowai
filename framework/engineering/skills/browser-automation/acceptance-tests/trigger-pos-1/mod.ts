import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// The query gained a concrete URL and credentials on 2026-08-24. The earlier
// wording said only "the staging signup page", and the sandbox is an empty repo
// that documents no staging environment. In the sweep of 2026-08-23 the agent
// named `browser-automation` in its own reasoning, quoted its description, and
// then stopped to ask for the URL rather than guess one — zero tool calls, and
// the item scored a routing miss that never happened. Supplying the material
// the task needs is not a hint: the query still names no skill and no tool.
export const BrowserAutomationTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "browser-automation-trigger-pos-1";
  name = "fill form and screenshot";
  skill = "browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open the staging signup page, fill the form with test credentials, submit it, and grab a screenshot of the result.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `browser-automation` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `browser-automation`.",
    critical: true,
  }];
}();
