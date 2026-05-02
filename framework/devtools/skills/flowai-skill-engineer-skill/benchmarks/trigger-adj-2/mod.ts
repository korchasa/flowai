import { BenchmarkSkillScenario } from "@bench/types.ts";

// Adjacent skill: flowai-skill-write-agent-benchmarks (writing benchmarks for an
// existing skill, not authoring the skill itself).
export const EngineerSkillTriggerAdj2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-skill-trigger-adj-2";
  name = "write benchmarks (adjacent)";
  skill = "flowai-skill-engineer-skill";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "My skill exists and works manually, but I want measurable scenarios that prove it does the right thing. Help me write tests for it.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-skill`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-skill/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-skill`.",
    critical: true,
  }];
}();
