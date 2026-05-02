import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-investigate — user is diagnosing a runtime bug in
// code, not asking against persisted knowledge.
export const MemexAskTriggerAdj3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-adj-3";
  name = "bug investigation query (adjacent)";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The checkout endpoint started returning 500s after the deploy this morning. Find the root cause and walk me through the evidence.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
