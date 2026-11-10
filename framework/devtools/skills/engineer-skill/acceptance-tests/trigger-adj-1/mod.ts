import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent work: an IDE slash command (a user-invoked workflow file, not an
// agent-invocable skill). No skill covers it; the agent answers directly.
export const EngineerSkillTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "engineer-skill-trigger-adj-1";
  name = "user-invoked workflow (adjacent)";
  skill = "engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a slash command I can invoke before every release that walks the agent through our deployment checklist step by step. Set it up.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `engineer-skill/SKILL.md` or calling the `Skill` tool with `engineer-skill`.",
    critical: true,
  }];
}();
