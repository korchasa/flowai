import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Positive: a direct "which model for this task" request — the canonical
// trigger for select-llm-model.
export const SelectLlmModelTriggerPos1 = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-trigger-pos-1";
  name = "model-pick request";
  skill = "select-llm-model";
  pack = "beta";
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  // Routing test: stub `curl` so that if the skill activates and starts fetching
  // it returns instantly instead of hanging on live network until the 300 s
  // watchdog kills the run. Payload content is irrelevant — the checklist only
  // asserts routing (did select-llm-model get invoked).
  mocks = {
    curl: "Model  Score\nAurora-7  71\nBorealis-3  64\nCypher-X  58",
  };
  userQuery =
    "Which LLM should I pick for building a coding agent that edits files autonomously? Rank a few options for me.";
  checklist = [{
    id: "skill_invoked",
    description:
      "Did the agent load and act on `select-llm-model` in response to this query? Look in the trace for a `Skill` tool call or a read of the skill's `SKILL.md` for `select-llm-model`.",
    critical: true,
  }];
}();
