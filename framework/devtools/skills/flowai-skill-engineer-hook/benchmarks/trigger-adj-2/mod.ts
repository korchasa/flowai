import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-engineer-rule (persistent rule in AGENTS.md, not
// an executable hook script).
export const EngineerHookTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-adj-2";
  name = "AGENTS.md rule (adjacent)";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want to write down a coding convention so the agent always uses tabs for indentation and never reformats existing files. Where does that go?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-hook`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-hook/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
