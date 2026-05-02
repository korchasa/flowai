import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-browser-automation (interactive site driving — the
// user wants tasks performed on a specific site, not a synthesized cited report).
export const DeepResearchTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-deep-research-trigger-adj-2";
  name = "interactive site task (adjacent)";
  skill = "flowai-skill-deep-research";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open this real-estate listing site, filter for two-bedroom apartments under 200k, and extract the top ten results with photos.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-deep-research`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-deep-research/SKILL.md` or calling the `Skill` tool with `flowai-skill-deep-research`.",
    critical: true,
  }];
}();
