import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * RED scenario: parent revision has a correct `applyDiscount` ( `>` threshold ).
 * setup() mutates discount.ts to use `>=`, introducing a hidden regression at
 * the boundary `price == threshold`. Existing tests still pass because they
 * do not exercise the boundary. The skill must synthesize a Catching JiTTest
 * that passes on the parent and fails on the diff.
 */
export const JitReviewCatchRegressionBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-jit-review-catch-regression";
  name = "JIT Review catches a boundary-condition regression";
  skill = "flowai-jit-review";
  stepTimeoutMs = 600_000;
  maxSteps = 30;

  agentsTemplateVars = {
    PROJECT_NAME: "DiscountEngine",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).",
  };

  userQuery =
    "/flowai-jit-review I'm actively editing this diff. Check my unstaged changes for hidden regressions before I commit — do a JIT review.";

  interactive = true;
  userPersona = `You are a developer reviewing your own unstaged changes.
You want JIT-review feedback before committing.
When the agent reports catching tests, acknowledge them briefly.
When the agent asks whether to save or discard the ephemeral tests, reply:
'discard all — I want to fix the bug first, then write a proper test myself'.`;

  override sandboxState = {
    commits: [],
    modified: ["discount.ts"],
    expectedOutcome:
      "Agent runs parent baseline in a git worktree (all green), infers intents, synthesizes a mutant and a test that passes on parent and fails on diff (catching), reports the boundary regression at discount.ts with file+line, writes tests to an ephemeral directory outside the main test tree and not under git, and on prompt discards the scratch directory without modifying production code.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // Inject the hidden regression: `>` → `>=`. Existing tests keep passing;
    // only a boundary-targeted JiTTest (price == threshold) exposes it.
    const buggy = `/**
 * Apply a 10% discount to orders priced strictly above a threshold.
 * Orders at or below the threshold are returned unchanged.
 */
export function applyDiscount(price: number, threshold: number): number {
  if (price >= threshold) return price * 0.9;
  return price;
}
`;
    await Deno.writeTextFile(`${sandboxDir}/discount.ts`, buggy);
  }

  checklist = [
    {
      id: "parent_baseline_in_worktree",
      description:
        "Did the agent reconstruct the parent revision (e.g. via `git worktree add` on HEAD, or `git show HEAD:discount.ts`) and run the project's declared `test` command against it, confirming parent is green before proceeding?",
      critical: true,
    },
    {
      id: "intents_enumerated",
      description:
        "Did the agent produce an explicit textual list of inferred intents for the diff (≤5 items) describing what the author tried to do and which invariants should hold?",
      critical: true,
    },
    {
      id: "targeted_mutant",
      description:
        "Did the agent formulate at least one risk-targeted mutant modelling a concrete failure mode tied to the diff (e.g. the `>=` vs `>` boundary mutation), rather than a generic code smell?",
      critical: true,
    },
    {
      id: "catching_test_generated",
      description:
        "Did the agent synthesize at least one test file that (a) passes on the parent revision and (b) fails on the current (diff) revision — i.e. satisfies the formal Catching-JiTTest criterion — with a boundary assertion such as `applyDiscount(threshold, threshold) === threshold`?",
      critical: true,
    },
    {
      id: "regression_reported_with_location",
      description:
        "Did the agent report the regression to the user with the specific file (`discount.ts`) and the line/construct (`>=` vs `>` comparator on the boundary)?",
      critical: true,
    },
    {
      id: "ephemeral_directory_rules",
      description:
        "Were the generated tests written to a directory that is (a) outside the main test tree, (b) not tracked by git (under `.gitignore` or system temp), and (c) discoverable within the session — NOT committed and NOT colocated next to `discount_test.ts`?",
      critical: true,
    },
    {
      id: "no_production_code_change",
      description:
        "Did the agent leave `discount.ts` unchanged (no attempt to fix the bug automatically) — JIT review reports risks, it does not silently patch production?",
      critical: true,
    },
    {
      id: "did_not_pollute_main_test_tree",
      description:
        "Did the agent avoid adding new tests next to `discount_test.ts` without an explicit user `save` command? On `discard`, the ephemeral directory is removed.",
      critical: true,
    },
  ];
}();
