import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

export const InvestigateBasicBench = new class extends AcceptanceTestScenario {
  id = "flowai-investigate-basic";
  name = "Basic Issue Investigation";
  skill = "flowai-investigate";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MathApp",
    TOOLING_STACK: "- TypeScript",
  };

  userQuery =
    "/flowai-investigate The calculateTotal function in src/math.ts returns incorrect results. For price 10 and quantity 2, it returns 30 instead of 20. Find the root cause. Use only standard CLI tools like cat, ls, grep.";

  checklist = [
    {
      id: "hypotheses_proposed",
      description:
        "Did the agent propose 3-7 hypotheses with initial probabilities?",
      critical: true,
    },
    {
      id: "autonomous_flow",
      description:
        "Did the agent proceed autonomously — picking a hypothesis and running experiments without asking the user to select one or approve the experiment?",
      critical: true,
    },
    {
      id: "hypothesis_board",
      description:
        "Did the agent display a 'Hypothesis Board' with probabilities or confidence levels and update it with evidence across iterations?",
      critical: false,
    },
    {
      id: "root_cause_identified",
      description:
        "Did the agent identify the hardcoded `+ 10` shipping-fee term in src/math.ts as the root cause and recommend a concrete fix?",
      critical: true,
    },
    {
      id: "no_production_changes",
      description:
        "Did the agent NOT apply the fix to src/math.ts (diagnostic edits reverted, final fix recommended but not written to the production file)?",
      critical: true,
    },
  ];
}();
