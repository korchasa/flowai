import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: implementing the improvement directly is execution, not authoring
// a proposal document about it.
export const WriteDepTriggerFalse2 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-write-dep-trigger-false-2";
  name = "implement the change directly (false-use)";
  skill = "flowai-skill-write-dep";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Skip the doc — just go ahead and refactor our auth middleware to use the new policy engine and update the tests.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-write-dep`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-write-dep/SKILL.md` or calling the `Skill` tool with `flowai-skill-write-dep`.",
    critical: true,
  }];
}();
