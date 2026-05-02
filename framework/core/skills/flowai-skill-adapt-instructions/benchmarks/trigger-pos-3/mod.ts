import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AdaptInstructionsTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-pos-3";
  name = "merge upstream template into AGENTS.md";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "The framework template was updated. Merge the new AGENTS.template.md into our AGENTS.md and show me the diff before writing.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-adapt-instructions` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
