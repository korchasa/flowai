import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AnalyzeContextTriggerPos2 = new class
  extends BenchmarkSkillScenario {
  id = "flowai-skill-analyze-context-trigger-pos-2";
  name = "audit context window usage";
  skill = "flowai-skill-analyze-context";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Audit my current context window — system prompt, rules, history — and tell me where most of the tokens are going.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-analyze-context` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-analyze-context`.",
    critical: true,
  }];
}();
