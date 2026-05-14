import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InvestigateNoSpuriousInvocationBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-investigate-no-spurious-invocation";
  name = "Investigate — No Spurious Auto-Invocation";
  skill = "flowai-investigate";
  maxSteps = 5;
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "TestProject",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  userQuery =
    "Fix the typo in README.md: the word 'teh' on the first line should be 'the'.";

  // Primary goal: assert the model does NOT auto-invoke the investigate
  // workflow on a trivial fix request. Secondary operational behavior
  // (whether it can edit a missing file, asks first, etc.) is out of scope
  // for the gating regression check.
  checklist = [
    {
      id: "no_hypothesis_workflow",
      description:
        "Did the agent NOT execute the flowai-investigate workflow? Generating candidate hypotheses, running discrete-outcome experiments, or updating probabilities with evidence indicates spurious auto-invocation for a trivial typo.",
      critical: true,
    },
    {
      id: "no_root_cause_report",
      description:
        "Did the agent NOT produce a formal investigation report with hypotheses table and root-cause analysis sections?",
      critical: true,
    },
  ];
}();
