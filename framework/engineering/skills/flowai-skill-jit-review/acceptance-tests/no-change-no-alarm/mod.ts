import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * REFACTOR scenario: parent and diff are behaviourally identical — a pure
 * rename + extracted helper. No risk to catch. The skill must NOT invent a
 * fake regression, must NOT commit scratch tests, and MUST explicitly report
 * that nothing behavioural changed.
 */
export const JitReviewNoChangeNoAlarmBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-skill-jit-review-no-change-no-alarm";
  name = "JIT Review stays silent on a behaviour-preserving refactor";
  skill = "flowai-skill-jit-review";
  stepTimeoutMs = 600_000;
  maxSteps = 30;

  agentsTemplateVars = {
    PROJECT_NAME: "ShippingEngine",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).",
  };

  userQuery =
    "/flowai-skill-jit-review I refactored shipping.ts without changing behaviour. Please JIT-review my unstaged changes and confirm there's no hidden regression.";

  interactive = true;
  userPersona = `You are a developer who just finished a pure rename refactor.
You believe behaviour is preserved and want the agent to confirm.
When the agent asks whether to save or discard any ephemeral tests it wrote,
reply: 'discard all'.`;

  override sandboxState = {
    commits: [],
    modified: ["shipping.ts"],
    expectedOutcome:
      "Agent runs parent baseline (green), inspects the refactor, finds no behavioural regression, and explicitly reports 'no behavioural regressions detected'. No catching test is produced (or any generated test passes on both parent and diff). The agent does NOT invent a fake bug, does NOT modify shipping.ts, does NOT write tests to the main test tree without consent, and disposes the ephemeral directory on `discard`.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // Pure refactor: extract per-tier helpers, inline into main function.
    // Behaviour is identical — same numeric outputs for all inputs.
    const refactored = `function euCost(weight: number): number {
  return 5 + weight * 0.5;
}

function usCost(weight: number): number {
  return 8 + weight * 0.7;
}

function intlCost(weight: number): number {
  return 12 + weight * 1.1;
}

/**
 * Compute shipping cost for a given weight and destination tier.
 * Diff revision — extracted helpers, same behaviour.
 */
export function shippingCost(
  weight: number,
  tier: "eu" | "us" | "intl",
): number {
  if (tier === "eu") return euCost(weight);
  if (tier === "us") return usCost(weight);
  return intlCost(weight);
}
`;
    await Deno.writeTextFile(`${sandboxDir}/shipping.ts`, refactored);
  }

  checklist = [
    {
      id: "parent_baseline_passed",
      description:
        "Did the agent run the project's declared `test` command against the parent revision (e.g. via `git worktree add`) and confirm it was green before synthesizing anything?",
      critical: true,
    },
    {
      id: "no_behavioural_regression_reported",
      description:
        "Did the final report EXPLICITLY state that no behavioural regression was detected (e.g. '0 catching tests', 'no behavioural regressions detected', or equivalent phrasing)?",
      critical: true,
    },
    {
      id: "no_false_catching_test",
      description:
        "Did the agent avoid reporting any catching test? (A genuine refactor has no such test. Either the agent generated no tests, OR every generated test passed on BOTH parent and diff — i.e. zero catching tests in the final report.)",
      critical: true,
    },
    {
      id: "no_production_change",
      description:
        "Did the agent leave shipping.ts in the exact shape produced by setup() — no auto-'fix', no re-revert to the parent?",
      critical: true,
    },
    {
      id: "no_main_tree_pollution",
      description:
        "Did the agent avoid adding new tests next to shipping_test.ts? Any ephemeral tests stayed in a scratch directory (not in git, not in the main test tree) and were removed on `discard`.",
      critical: true,
    },
  ];
}();
