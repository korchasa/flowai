import { BenchmarkSkillScenario } from "@bench/types.ts";

export const EngineerHookTriggerPos3 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-engineer-hook-trigger-pos-3";
  name = "audit tool calls";
  skill = "flowai-skill-engineer-hook";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Before any tool call goes through, I want a small script to log the command and arguments to a file for auditing. How do I add that?";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-engineer-hook` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-engineer-hook`.",
    critical: true,
  }];
}();
