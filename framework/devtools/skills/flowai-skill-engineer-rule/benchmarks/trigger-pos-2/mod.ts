import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerRuleTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-rule-trigger-pos-2";
  name = "file-pattern convention";
  skill = "flowai-skill-engineer-rule";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Whenever the agent touches files under src/api, I want it to follow our error-handling convention. Capture that as a persistent guideline.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-rule` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-rule`.",
    critical: true,
  }];
}();
