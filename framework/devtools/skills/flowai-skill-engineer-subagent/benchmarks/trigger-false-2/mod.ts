import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: invoking an existing reviewer agent on a diff is execution, not
// authoring a new agent definition.
export const EngineerSubagentTriggerFalse2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-false-2";
  name = "invoke existing reviewer (false-use)";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Hand off my staged diff to the code-reviewer agent and bring back its feedback so I can address the issues before committing.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
