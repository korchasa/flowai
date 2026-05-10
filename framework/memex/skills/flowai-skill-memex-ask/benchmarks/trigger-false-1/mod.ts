import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: question is a web/Stack Overflow lookup, not a memex query.
export const MemexAskTriggerFalse1 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-memex-ask-trigger-false-1";
  name = "external web lookup";
  skill = "flowai-skill-memex-ask";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Search Stack Overflow and tell me the canonical way to debounce input in React with TypeScript.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-memex-ask`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-memex-ask/SKILL.md` or calling the `Skill` tool with `flowai-skill-memex-ask`.",
    critical: true,
  }];
}();
