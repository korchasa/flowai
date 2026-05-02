import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta-historical question — user wants pedagogy, not to write a
// production prompt.
export const EngineerPromptsForInstantTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-prompts-for-instant-trigger-false-2";
  name = "history of prompting techniques";
  skill = "flowai-skill-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Give me a short history of prompt-engineering techniques for small models — chain-of-thought, few-shot, and so on, just for context.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
