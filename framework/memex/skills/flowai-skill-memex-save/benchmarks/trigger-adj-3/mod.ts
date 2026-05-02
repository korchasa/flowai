import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-memex-audit — user wants a structural check of
// the existing memex, not to add a new source.
export const MemexSaveTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-adj-3";
  name = "memex audit request (adjacent)";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Walk through our memex and report any orphan pages or broken wikilinks — I think it has drifted since the last cleanup.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
