import { BenchmarkSkillScenario } from "@bench/types.ts";

export const InvestigateTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-investigate-trigger-pos-2";
  name = "diagnose without applying fix";
  skill = "flowai-skill-investigate";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Memory grows unbounded under load and I have no idea why. Run a controlled investigation, document evidence, and recommend a fix — but stop before applying it.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-investigate` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-investigate`.",
    critical: true,
  }];
}();
