import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: question about reading AGENTS.md (information request), not a
// request to realign it with the upstream template.
export const AdaptInstructionsTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-adapt-instructions-trigger-false-3";
  name = "summarize current AGENTS.md";
  skill = "flowai-skill-adapt-instructions";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Give me a quick summary of what rules our AGENTS.md currently enforces, no edits needed.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-adapt-instructions`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-adapt-instructions/SKILL.md` or calling the `Skill` tool with `flowai-skill-adapt-instructions`.",
    critical: true,
  }];
}();
