import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * RED scenario: parent revision has a correct `applyDiscount` ( `>` threshold ).
 * setup() mutates discount.ts to use `>=`, introducing a hidden regression at
 * the boundary `price == threshold`. Existing tests still pass because they
 * do not exercise the boundary. The review skill's JiT subset must synthesize
 * a Catching JiTTest that passes on the parent and fails on the diff.
 */
export const ReviewCatchesRegressionViaJitTestsBench = new class
  extends AcceptanceTestScenario {
  id = "review-catches-regression-via-jittests";
  name = "Review catches a boundary-condition regression via JiT subset";
  skill = "review";
  stepTimeoutMs = 600_000;
  maxSteps = 30;

  agentsTemplateVars = {
    PROJECT_NAME: "DiscountEngine",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).",
  };

  userQuery =
    "/review I'm about to commit this diff. Please review the unstaged changes — catch anything I missed including hidden regressions.";

  interactive = true;
  userPersona = `You are a developer who just finished editing discount.ts.
You want a thorough review before committing.
When the agent reports catching tests or other findings, acknowledge them briefly.
When the agent asks whether to save or discard the ephemeral tests, reply:
'discard all — I want to fix the bug first, then write a proper test myself'.`;

  override sandboxState = {
    commits: [],
    modified: ["discount.ts"],
    expectedOutcome:
      "Agent performs full review: runs the project's declared test command on the working tree AND on a reconstructed parent revision (git worktree or git show fallback). Infers intents from the diff (≤5). Within the same pass, synthesizes a mutant and a catching test that passes on parent and fails on diff, exposing the boundary regression at discount.ts with file+line. Reports the regression as a [critical] catching-test finding pushing verdict to Request Changes. Ephemeral tests live outside the main test tree and outside git tracking; on 'discard' prompt, scratch directory is removed without modifying production code.",
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
        "Did the agent reconstruct the parent revision (e.g. via `git worktree add` on HEAD, or `git show HEAD:discount.ts`) and run the project's declared `test`/`check` command against it, confirming parent is green before proceeding with the JiT subset?",
      critical: true,
    },
    {
      id: "intents_enumerated",
      description:
        "Did the agent produce an explicit textual list of inferred intents for the diff (≤5 items) describing what the author tried to do and which invariants should hold? The Intents section should appear in the final report.",
      critical: true,
    },
    {
      id: "targeted_mutant_or_risk",
      description:
        "Did the agent formulate at least one risk-targeted hypothesis modelling a concrete failure mode tied to the diff (e.g. the `>=` vs `>` boundary mutation), rather than a generic code smell?",
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
        "Did the agent report the regression to the user as a [critical] catching-test finding with the specific file (`discount.ts`) and the line/construct (`>=` vs `>` comparator on the boundary)?",
      critical: true,
    },
    {
      id: "verdict_pushed_to_request_changes",
      description:
        "Did the catching test push the final review verdict to `Request Changes` (or equivalent rejection verdict)? A surviving catching test is a [critical] finding by Rule 9 and MUST NOT result in Approve.",
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
        "Did the agent leave `discount.ts` unchanged (no attempt to fix the bug automatically) — review reports risks, it does not silently patch production?",
      critical: true,
    },
    {
      id: "scratch_dir_disposed_on_discard",
      description:
        "On the user's 'discard all' reply, did the agent delete the scratch directory and not leave stray ephemeral test files in the sandbox?",
      critical: true,
    },
  ];
}();
