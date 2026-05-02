import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectTriggerPos2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-pos-2";
  name = "audit context usage";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Audit how you used the context window in this conversation — which reads were redundant, which tools were misused, what process improvements come to mind?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-reflect` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-reflect`.",
    critical: true,
  }];
}();
