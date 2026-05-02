import { BenchmarkSkillScenario } from "@bench/types.ts";

// False-use: meta question about subagent semantics, not a request to author one.
export const EngineerSubagentTriggerFalse1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-false-1";
  name = "meta question about subagents";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "What's the difference between a subagent and just spawning another conversation, and how does context propagate between them?";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-skill-engineer-subagent`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-skill-engineer-subagent/SKILL.md` or calling the `Skill` tool with `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
