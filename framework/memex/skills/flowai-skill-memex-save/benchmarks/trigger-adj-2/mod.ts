import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-deep-research — user wants a fresh research
// report produced, not a source persisted into the memex.
export const MemexSaveTriggerAdj2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-save-trigger-adj-2";
  name = "deep research request (adjacent)";
  skill = "flowai-skill-memex-save";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Produce a deep research report on vector-database options for RAG in 2026 — sources, trade-offs, executive summary at the top.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-save`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-save/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-save`.",
    critical: true,
  }];
}();
