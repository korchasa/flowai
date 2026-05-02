import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: vocabulary collision — multi-agent orchestration research, not
// authoring a flowai subagent definition.
export const EngineerSubagentTriggerFalse3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-false-3";
  name = "multi-agent theory question (false-use)";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Summarize current research on multi-agent reinforcement learning and how communication protocols between agents are typically modeled.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
