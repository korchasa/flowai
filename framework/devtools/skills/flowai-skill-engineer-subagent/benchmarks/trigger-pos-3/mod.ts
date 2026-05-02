import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerSubagentTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-pos-3";
  name = "debugger agent";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Help me create a custom debugger agent definition that the orchestrator can spawn whenever a stack trace shows up in the conversation.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-subagent` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
