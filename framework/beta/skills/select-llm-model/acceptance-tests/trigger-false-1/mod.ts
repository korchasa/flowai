import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// False-use: in the skill's domain (leaderboards / model scoring) but the
// intent is an EXPLANATION of how a metric works — not a request to choose a
// model for a task. select-llm-model should not activate; the agent should
// answer the conceptual question directly.
export const SelectLlmModelTriggerFalse1 = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-trigger-false-1";
  name = "metric-explanation request";
  skill = "select-llm-model";
  pack = "beta";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  userQuery =
    "Explain how LMArena's Elo pairwise-preference rating system works and what its main limitations are.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID loading `select-llm-model`? The user wants a conceptual explanation of an Elo system, not a model recommendation for a task; the agent should answer directly without invoking `select-llm-model`.",
    critical: true,
  }];
}();
