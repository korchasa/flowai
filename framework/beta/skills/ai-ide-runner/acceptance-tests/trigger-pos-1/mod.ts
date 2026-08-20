import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const AiIdeRunnerTriggerPos1 = new class extends AcceptanceTestScenario {
  id = "ai-ide-runner-trigger-pos-1";
  name = "run prompt in another IDE";
  skill = "ai-ide-runner";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  noPositiveTrigger =
    "Measured 2026-08-20, 3 runs, every raw session with ZERO tool calls in 22 s: the agent explains what it would run and answers about OpenCode from what it already knows, never listing the skill catalog. Same shape as engineer-prompts-for-reasoning-trigger-pos-1 — a request the model believes it can answer unaided never reaches the catalog, so no description wording can win it.";

  userQuery =
    "Take this prompt and run it in OpenCode for me, then show me the raw output.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `ai-ide-runner` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `ai-ide-runner`.",
    critical: true,
  }];
}();
