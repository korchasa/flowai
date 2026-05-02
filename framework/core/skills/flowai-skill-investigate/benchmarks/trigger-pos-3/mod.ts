import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InvestigateTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-pos-3";
  name = "weird production behavior";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Users report cart totals are sometimes 1 cent off after checkout — only on prod, never in staging. Help me find the underlying cause with experiments and evidence.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-investigate` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-investigate`.",
    critical: true,
  }];
}();
