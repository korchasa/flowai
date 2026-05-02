import { BenchmarkSkillScenario } from "@bench/types.ts";

export const BrowserAutomationTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-pos-1";
  name = "fill form and screenshot";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open the staging signup page, fill the form with test credentials, submit it, and grab a screenshot of the result.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-browser-automation` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
