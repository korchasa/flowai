import { BenchmarkSkillScenario } from "@bench/types.ts";

export const BrowserAutomationTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-browser-automation-trigger-pos-2";
  name = "scrape product listings";
  skill = "flowai-skill-browser-automation";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Navigate to this catalog URL, scroll through every page, and pull out each product title and price into a JSON file.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-browser-automation` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-browser-automation`.",
    critical: true,
  }];
}();
