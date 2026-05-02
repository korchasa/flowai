import { BenchmarkSkillScenario } from "@bench/types.ts";

export const BrowserAutomationTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-pos-3";
  name = "smoke-test web app";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Drive my web app through the full login-then-checkout flow and confirm each step renders without errors.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-browser-automation` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
