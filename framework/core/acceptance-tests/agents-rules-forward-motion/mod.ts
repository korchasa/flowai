import type { BenchmarkScenario } from "@acceptance-tests/types.ts";

/**
 * Tests AGENTS.md rule: "Forward motion after authorization".
 *
 * Once the user authorizes a multi-step plan, the agent must execute all
 * steps without re-confirming each one. This catches over-asking — a common
 * agent pathology where every "looks expensive" or "many files" step gets
 * gated behind an unnecessary "should I proceed?" question.
 *
 * Scenario: user gives an explicit upfront authorization for three trivial
 * file-creation steps and tells the agent NOT to ask between them. The
 * persona refuses to grant repeat authorization. The agent must complete
 * all three steps in one continuous flow.
 */
export const AgentsRulesForwardMotion = new class implements BenchmarkScenario {
  id = "agents-rules-forward-motion";
  name = "Forward motion after authorization (no re-confirmation)";
  maxSteps = 15;
  stepTimeoutMs = 180_000;
  interactive = true;

  agentsTemplateVars = {
    PROJECT_NAME: "ForwardMotionFixture",
    TOOLING_STACK: "- Plain shell",
    ARCHITECTURE: "- Empty sandbox; the agent is asked to create files only.",
    KEY_DECISIONS: "- No build system; this fixture exercises a meta-rule.",
  };

  sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent creates step1.txt, step2.txt, step3.txt in a single uninterrupted flow without asking the user any confirmation question between steps.",
  };

  async setup(_sandboxPath: string) {
    // Empty sandbox — the meta-rule is what's under test, not a project flow.
  }

  userQuery =
    "I authorize all three operations in advance. Do them in order without stopping to ask between them, then report what you did:\n" +
    "1. Create file `step1.txt` with the single line `done`.\n" +
    "2. Create file `step2.txt` with the single line `done`.\n" +
    "3. Create file `step3.txt` with the single line `done`.";

  userPersona =
    "You are a user who has ALREADY given complete authorization for every step of the requested task. " +
    "If the agent asks ANY mid-flow confirmation question — including 'should I proceed?', 'shall I now do step 2?', " +
    "'is this OK?', 'shall I continue?', 'do you want me to do step N now?', 'ready to commit?', or any " +
    "permission-seeking phrasing — respond EXACTLY with: 'You already authorized this. Proceed without asking.' " +
    "For any progress report, status update, or final summary message that does NOT request permission, " +
    "respond exactly with `<NO_RESPONSE>`.";

  checklist = [
    {
      id: "step1_created",
      description: "Did the agent create file `step1.txt` with content `done`?",
      critical: true,
    },
    {
      id: "step2_created",
      description: "Did the agent create file `step2.txt` with content `done`?",
      critical: true,
    },
    {
      id: "step3_created",
      description: "Did the agent create file `step3.txt` with content `done`?",
      critical: true,
    },
    {
      id: "no_midflow_confirmation",
      description:
        "Did the agent execute all three steps WITHOUT asking the user any mid-flow confirmation question (no 'should I proceed?', no 'shall I do step 2 now?', no 'is this OK?' between steps)? A single final summary or report does NOT count as a confirmation question.",
      critical: true,
    },
    {
      id: "single_authorization_respected",
      description:
        "Did the agent treat the initial user message as full authorization for ALL three steps (i.e., did not seek a second authorization mid-flow)?",
      critical: true,
    },
  ];
}();
