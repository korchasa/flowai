import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta documentation request about the skill itself, not an audit run.
export const AnalyzeContextTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-false-2";
  name = "meta question about the skill";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What does the context analysis workflow generally include, and when is it overkill — just describe it conceptually.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-analyze-context`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-analyze-context/SKILL.md` or calling the `Skill` tool with `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
