import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-deep-research (research-focused: cited synthesis from
// many web sources rather than driving a single site interactively).
export const BrowserAutomationTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-browser-automation-trigger-adj-1";
  name = "cited research synthesis (adjacent)";
  skill = "flowai-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Give me a cited overview of state-of-the-art retrieval-augmented generation papers from the past year with linked sources.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-browser-automation`.",
    critical: true,
  }];
}();
