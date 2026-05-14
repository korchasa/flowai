import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-engineer-prompts-for-instant (target is a fast
// instant model — Haiku, Flash, GPT-4o Mini — different guidance and trade-offs).
export const EngineerPromptsForReasoningTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-prompts-for-reasoning-trigger-adj-1";
  name = "prompt for fast instant model (adjacent)";
  skill = "flowai-engineer-prompts-for-reasoning";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Give me a stable, predictable prompt for Gemini Flash that classifies short tweets into sentiment buckets.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-engineer-prompts-for-reasoning`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-engineer-prompts-for-reasoning/SKILL.md` or calling the `Skill` tool with `flowai-engineer-prompts-for-reasoning`.",
    critical: true,
  }];
}();
