import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the skill works — surface vocabulary
// match (AGENTS.md, template) but the user is not asking to perform the merge.
export const AdaptInstructionsTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-false-2";
  name = "meta question about the workflow";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does flowai's AGENTS.md template realignment process generally work? Just curious before I run it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
