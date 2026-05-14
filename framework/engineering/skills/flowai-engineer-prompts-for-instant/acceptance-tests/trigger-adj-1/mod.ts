import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent skill: flowai-engineer-prompts-for-reasoning (target is a smart
// reasoning model — Sonnet, GPT-4o, Gemini Pro — different guidance).
export const EngineerPromptsForInstantTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "flowai-engineer-prompts-for-instant-trigger-adj-1";
  name = "prompt for reasoning model (adjacent)";
  skill = "flowai-engineer-prompts-for-instant";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "I want a structured prompt for Claude 3.5 Sonnet so it can reason through a multi-step legal analysis with full context.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `flowai-engineer-prompts-for-instant`? For this query the skill is not appropriate; the agent should either invoke a different skill or respond directly without reading `flowai-engineer-prompts-for-instant/SKILL.md` or calling the `Skill` tool with `flowai-engineer-prompts-for-instant`.",
    critical: true,
  }];
}();
