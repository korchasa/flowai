import { BenchmarkSkillScenario } from "@bench/types.ts";

export const MemexAskTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-pos-2";
  name = "look up a vendor decision in the memex";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Look in our memex and tell me which payment provider we ended up choosing and why — I need a cited answer, not a guess.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-memex-ask` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
