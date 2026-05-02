import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about the workflow itself, not a request to mine
// historical transcripts.
export const ReflectByHistoryTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-by-history-trigger-false-2";
  name = "meta question about the workflow";
  skill = "flowai-skill-reflect-by-history";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Where does flowai store IDE transcripts and how would the historical reflection skill consume them? Just curious.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-reflect-by-history`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-reflect-by-history/SKILL.md` or calling the `Skill` tool with `flowai-skill-reflect-by-history`.",
    critical: true,
  }];
}();
