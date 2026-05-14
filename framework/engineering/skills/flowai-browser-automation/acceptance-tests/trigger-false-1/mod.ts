import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: meta documentation question — user wants explanation, not automation.
export const BrowserAutomationTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-browser-automation-trigger-false-1";
  name = "meta documentation question";
  skill = "flowai-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Conceptually, what is the difference between Playwright, Puppeteer, and Selenium for end-to-end testing — no setup, just a comparison.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-browser-automation`.",
    critical: true,
  }];
}();
