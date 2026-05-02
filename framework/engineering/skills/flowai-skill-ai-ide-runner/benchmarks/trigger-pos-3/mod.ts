import { BenchmarkSkillScenario } from "@bench/types.ts";

export const AiIdeRunnerTriggerPos3 = new class extends BenchmarkSkillScenario {
  id = "flowai-skill-ai-ide-runner-trigger-pos-3";
  name = "fan out across models";
  skill = "flowai-skill-ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Fan this prompt out across Sonnet, Haiku, and Gemini Pro and bring back what each one says.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `flowai-skill-ai-ide-runner` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `flowai-skill-ai-ide-runner`.",
    critical: true,
  }];
}();
