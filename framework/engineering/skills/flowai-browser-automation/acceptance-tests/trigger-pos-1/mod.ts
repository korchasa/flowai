import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const BrowserAutomationTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-browser-automation-trigger-pos-1";
  name = "fill form and screenshot";
  skill = "flowai-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open the staging signup page, fill the form with test credentials, submit it, and grab a screenshot of the result.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-browser-automation` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-browser-automation`.",
    critical: true,
  }];
}();
