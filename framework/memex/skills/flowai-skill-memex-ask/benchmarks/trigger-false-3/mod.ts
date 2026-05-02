import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: "ask the bot" framing without memex relevance — generic chat
// question answerable from training data, no knowledge-bank intent.
export const MemexAskTriggerFalse3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-false-3";
  name = "generic chat question (no memex intent)";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Quick question for the bot: what does the HTTP 418 status code mean and where did it come from?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
