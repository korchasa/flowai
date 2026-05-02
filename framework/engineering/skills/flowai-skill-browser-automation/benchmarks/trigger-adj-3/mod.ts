import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate (controlled hypothesis-based diagnosis
// of a failure — server-side bug, no browser interaction needed).
export const BrowserAutomationTriggerAdj3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-adj-3";
  name = "diagnose backend bug (adjacent)";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Users report intermittent 500s on the checkout endpoint — investigate hypothesis by hypothesis and find the root cause.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
