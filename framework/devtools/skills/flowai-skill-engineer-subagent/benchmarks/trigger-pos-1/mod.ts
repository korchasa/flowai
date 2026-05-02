import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerSubagentTriggerPos1 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-subagent-trigger-pos-1";
  name = "code reviewer subagent";
  skill = "flowai-skill-engineer-subagent";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Set up a dedicated code-reviewer assistant the main agent can hand off to for security and architecture passes on staged diffs.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-subagent` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-subagent`.",
    critical: true,
  }];
}();
