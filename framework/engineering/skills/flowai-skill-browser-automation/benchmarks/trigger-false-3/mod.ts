import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary overlap ("scrape", "extract") but user wants help parsing
// HTML they already have on disk — no live browser session required.
export const BrowserAutomationTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-false-3";
  name = "parse local html dump";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I already saved this product page as an HTML file on disk — write me a small parser that extracts the prices from it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-browser-automation`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-browser-automation/SKILL.md` or calling the `Skill` tool with `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
