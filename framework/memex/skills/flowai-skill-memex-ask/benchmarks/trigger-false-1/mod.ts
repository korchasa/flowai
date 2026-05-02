import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about how the memex-ask workflow works, not an actual
// query to be answered from the memex.
export const MemexAskTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-false-1";
  name = "meta question about the skill";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "How does the memex-ask flow decide which pages to open and how many wikilink hops it follows?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
