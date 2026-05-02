import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary match ("past sessions") but the user wants to read
// one specific session's transcript, not mine patterns across many.
export const ReflectByHistoryTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-false-3";
  name = "open one past transcript";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open the transcript from yesterday's session — I want to copy a snippet of code I wrote there.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
