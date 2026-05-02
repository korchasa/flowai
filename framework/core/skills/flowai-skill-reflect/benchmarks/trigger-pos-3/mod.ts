import { BenchmarkSkillScenario } from "@bench/types.ts";

export const ReflectTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-reflect-trigger-pos-3";
  name = "extract lessons from this task";
  skill = "flowai-skill-reflect";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Now that we're done, walk through how this current task was executed and extract concrete lessons that should improve our process.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-reflect` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-reflect`.",
    critical: true,
  }];
}();
