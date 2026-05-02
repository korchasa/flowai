import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-plan (single-session task plan in GODS format,
// not a multi-phase epic).
export const EpicTriggerAdj1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-epic-trigger-adj-1";
  name = "single-session task plan (adjacent)";
  skill = "flowai-skill-epic";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to add a `--dry-run` flag to the CLI today. Write the GODS task file before I start coding.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-epic`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-epic/SKILL.md` or calling the `Skill` tool with `flowai-skill-epic`.",
    critical: true,
  }];
}();
