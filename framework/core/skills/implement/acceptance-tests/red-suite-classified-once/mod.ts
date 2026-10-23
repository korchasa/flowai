import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Red-suite cost scenario for `implement` (SWE-rebench Sonnet campaign
 * 2026-10-21: the suites of the benchmark repositories are red before any
 * change, and the flowai arm reran the whole suite — on the change and on the
 * parent revision — to tell pre-existing failures from its own; one nicegui
 * session kept `full_suite.log`, `full_suite2.log` and `full_suite3.log`).
 *
 * The fixture's suite holds a slow, unrelated ledger test (about 20 s) and
 * `tests/receipt_test.ts`, which already fails on the parent revision
 * (`formatMoney` does not group thousands). In the campaign the whole-suite
 * runs of the implement turn sat before the first source edit (40) and after
 * the last one (52), almost never between steps (2): the agent took a
 * baseline, often more than once, then reran the suite at the end and on the
 * parent. The skill must run the whole suite at most twice in all — once
 * before the change, if it wants a record of pre-existing failures, and once
 * after — and classify the receipt failure from that record or by running
 * only the failing test file on the parent revision, in a separate tree.
 */
export const ImplementRedSuiteClassifiedOnce = new class
  extends AcceptanceTestScenario {
  id = "implement-red-suite-classified-once";
  name =
    "Implement runs the whole suite at most twice and still shows a failure is pre-existing";
  skill = "implement";
  maxSteps = 35;
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Billing",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).\n" +
      "- `check` — format + lint + tests (`deno task check`).",
  };
  interactive = true;

  userQuery =
    "/implement Execute the Solution in documents/tasks/2026/10/line-discounts.md under TDD.";

  userPersona =
    `You are a developer who wrote the plan and wants it implemented under TDD.
When the agent asks questions or proposes a plan, confirm and let it proceed.
If the agent reports a failure it believes is unrelated to the change, acknowledge it.
Keep answers brief and affirmative.`;

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent implements the discount and its tests, runs `deno task check` once all steps are in, sees " +
      "tests/receipt_test.ts fail, runs that one test file on the parent revision in a separate tree (a temporary " +
      "git worktree of HEAD), sees it fail there too, and reports it as pre-existing and out of scope.",
  };

  checklist = [
    {
      id: "classification_evidence_targeted",
      description:
        "How did the agent establish that the receipt failure exists without the change? PASS if it came from a whole-suite run made on the working tree BEFORE the agent's first source edit (the failure is on that record), or from running the receipt test file alone (`tests/receipt_test.ts`, or a filter on the thousands test) against the parent revision in a separate tree. FAIL if the agent ran the whole suite (`deno task check`, `deno task test`, `deno test` with no file, `deno test tests/`) against the parent revision, or if it called the failure pre-existing with neither kind of evidence.",
      critical: true,
    },
    {
      id: "whole_suite_runs_bounded",
      description:
        "Count every run of the WHOLE suite in the session, on any tree — the working tree before the change, the working tree after it, and any copy or worktree of the parent revision (`deno task check`, `deno task test`, `deno test` with no file, `deno test tests/`). Are there at most two? FAIL on three or more. Runs that name a test file do not count.",
      critical: true,
    },
    {
      id: "failure_reported_pre_existing",
      description:
        "Did the agent report the receipt thousands-grouping failure as pre-existing / out of scope, without editing src/money.ts or tests/receipt_test.ts?",
      critical: true,
    },
    {
      id: "discount_implemented",
      description:
        "At the end, does src/invoice.ts contain `discountPct` with a `RangeError` for an out-of-range value, and does tests/invoice_test.ts cover the discount?",
      critical: true,
    },
    {
      id: "working_tree_kept",
      description:
        "Did the agent leave its uncommitted work in the working tree while looking at the parent (no `git stash`, no `git checkout --`/`git restore`/`git reset --hard` of its files)?",
      critical: false,
    },
  ];
}();
