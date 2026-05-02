import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the memex-save workflow works,
// not an actual request to persist a source.
export const MemexSaveTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-false-2";
  name = "meta question about the skill";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does the memex-save flow decide which entities to extract, and what does its backlink audit actually verify?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
