import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: casual read of a source, no intent to persist into the memex.
export const MemexSaveTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-false-3";
  name = "casual read of a source (no persist intent)";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Open this article (https://example.com/post) and just summarise the key points for me — no need to file it anywhere.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
