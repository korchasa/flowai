import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-fix-tests (web-app test suite is failing — that is
// repair of an existing test, not interactive browser automation).
export const BrowserAutomationTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-adj-2";
  name = "fix failing e2e test (adjacent)";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My Playwright login test is failing after I renamed an element selector — please track down the root cause and fix the test.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
