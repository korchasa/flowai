import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerSubagentTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-pos-2";
  name = "domain-specific assistant";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a separate database expert with its own system prompt and tool access that the main assistant can call when it needs schema work.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-subagent` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
