import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: the word "skills" is used in the human-learning sense, not
// flowai SKILL.md authoring.
export const EngineerSkillTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-engineer-skill-trigger-false-1";
  name = "human skill development advice";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to level up at TypeScript fast — what skills should I focus on first, and in what order?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
