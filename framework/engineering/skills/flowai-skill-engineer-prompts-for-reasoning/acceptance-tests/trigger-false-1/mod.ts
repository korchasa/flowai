import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: meta question about model capabilities — vocabulary overlap with
// "reasoning" but the user wants pedagogy, not a production prompt.
export const EngineerPromptsForReasoningTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-prompts-for-reasoning-trigger-false-1";
  name = "explain reasoning model differences";
  skill = "flowai-skill-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain conceptually how chain-of-thought reasoning works inside a large language model — I am writing a workshop slide.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
