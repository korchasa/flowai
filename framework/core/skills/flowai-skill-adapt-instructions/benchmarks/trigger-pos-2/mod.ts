import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AdaptInstructionsTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-pos-2";
  name = "explicit re-adapt request";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Our AGENTS.md is drifting from the upstream template. Please re-adapt it so the structure matches but our customizations stay intact.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-adapt-instructions` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
