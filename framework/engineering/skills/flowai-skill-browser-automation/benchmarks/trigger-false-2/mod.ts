import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: surface vocabulary match ("browser") but the user wants advice on
// browser-vendor differences in CSS — no automation involved.
export const BrowserAutomationTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-false-2";
  name = "css browser compatibility";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Why does my flexbox layout look different in Safari versus Chrome, and what is the standard fix for that?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
