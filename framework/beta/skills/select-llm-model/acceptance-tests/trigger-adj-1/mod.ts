import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

// Adjacent-negative: the query is in the LLM neighbourhood but the intent is to
// AUTHOR A PROMPT for a model, not to choose WHICH model to use. That is a
// prompt-engineering concern, not model selection — select-llm-model should NOT
// activate. (An earlier "write a cited research report" phrasing correctly
// routed AWAY from select-llm-model, but into deep-research's long-running
// Workflow, which the 300 s watchdog killed — a flawed routing probe. A prompt-
// drafting task is handled inline and fast, keeping the probe about routing.)
export const SelectLlmModelTriggerAdj1 = new class
  extends AcceptanceTestScenario {
  id = "select-llm-model-trigger-adj-1";
  name = "prompt-authoring request (not model selection)";
  skill = "select-llm-model";
  pack = "beta";
  maxSteps = 6;
  agentsTemplateVars = { PROJECT_NAME: "Sandbox" };
  // Stub curl in case the agent fetches anything — keeps the probe off live
  // network. The checklist asserts only that select-llm-model was NOT chosen.
  mocks = { curl: "stub" };
  userQuery =
    "Draft an effective system prompt for an LLM that triages incoming customer-support tickets by urgency and category. Just give me the prompt text.";
  checklist = [{
    id: "skill_not_invoked",
    description:
      "Did the agent AVOID using `select-llm-model`? This asks the agent to WRITE A PROMPT for a model, not to pick which model to use — a prompt-engineering task. A correct run drafts the prompt directly (or via a prompt skill) and does NOT invoke `select-llm-model`.",
    critical: true,
  }];
}();
