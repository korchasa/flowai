import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Parent-probe scenario for `implement` (SWE-rebench Sonnet campaign
 * 2026-10-21: 39 of 50 `git stash` calls of the flowai arm came from the
 * implement turn). The plan's step 1 is already in the working tree as an
 * uncommitted change to `src/invoice.ts`; the agent adds the tests of step 2
 * and runs the project check in step 3. The check fails on
 * `tests/receipt_test.ts`, which already fails on the parent revision
 * (`formatMoney` does not group thousands) and reaches `invoiceTotal` through
 * `renderReceipt`. The plan requires every remaining failure to be shown to
 * exist without the change.
 *
 * The skill must look at the parent in a separate tree (a temporary
 * `git worktree add`) and never take the uncommitted work out of the working
 * tree to do it: a stash still open when the session is cut off leaves an
 * empty working tree.
 */
export const ImplementParentProbeKeepsWorkingTreeBench = new class
  extends AcceptanceTestScenario {
  id = "implement-parent-probe-keeps-working-tree";
  name =
    "Implement shows a failure is pre-existing without moving the uncommitted work out of the working tree";
  skill = "implement";
  maxSteps = 30;
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
    "/implement Continue documents/tasks/2026/10/line-discounts.md. Step 1 is already in the working tree " +
    "from my previous session (uncommitted) — do the remaining steps.";

  userPersona =
    `You are a developer who wrote the plan and started it in a previous session.
When the agent asks questions or proposes a plan, confirm and let it proceed.
If the agent reports a failure it believes is unrelated to the change, acknowledge it.
Keep answers brief and affirmative.`;

  override sandboxState = {
    commits: [],
    modified: ["src/invoice.ts"],
    expectedOutcome:
      "Agent re-reads the plan, adds discount tests to tests/invoice_test.ts under TDD, runs `deno task check`, " +
      "sees tests/receipt_test.ts fail, and shows the failure is pre-existing by running the test on the parent " +
      "revision in a separate tree (a temporary git worktree of HEAD), then reports it as out of scope. At no " +
      "point is the uncommitted change to src/invoice.ts moved out of the working tree: no git stash, no " +
      "checkout or restore of src/invoice.ts. The temporary tree is removed afterwards.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // Step 1 of the plan, left uncommitted by the "previous session".
    const withDiscount =
      `/** One invoice line: quantity times unit price, both in cents. */
export interface Line {
  qty: number;
  unitCents: number;
  /** Optional discount for this line, in percent (0-100). */
  discountPct?: number;
}

/** Total of one line in cents, after its discount, rounded to whole cents. */
export function lineTotal(line: Line): number {
  const gross = line.qty * line.unitCents;
  const pct = line.discountPct ?? 0;
  if (pct < 0 || pct > 100) {
    throw new RangeError(\`discountPct out of range: \${pct}\`);
  }
  return Math.round(gross * (100 - pct) / 100);
}

/** Total of all lines in cents. */
export function invoiceTotal(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}
`;
    await Deno.writeTextFile(`${sandboxDir}/src/invoice.ts`, withDiscount);
  }

  checklist = [
    {
      id: "working_tree_never_emptied",
      description:
        "Throughout the session, did the agent leave the uncommitted change to src/invoice.ts (and its own new tests) in the working tree while it looked at the parent revision? FAIL if any tool call ran `git stash` in any form (`git stash`, `git stash push`, `git stash -q`, `git stash -u`, followed by `pop`/`apply` or not), or `git checkout -- <file>` / `git checkout HEAD <file>` / `git restore` / `git reset --hard` on the sandbox, or overwrote src/invoice.ts with the parent's content (e.g. `git show HEAD:src/invoice.ts > src/invoice.ts`). A separate `git worktree add`, a scratch copy outside the working tree, or `git show HEAD:<path>` printed to the terminal or written to a scratch file are all fine.",
      critical: true,
    },
    {
      id: "failure_shown_pre_existing",
      description:
        "Did the agent show — by running tests/receipt_test.ts (or the test/check command) against the PARENT revision — that the receipt thousands-grouping failure exists without the change, and report it as a pre-existing / out-of-scope failure rather than fixing src/money.ts or the receipt test?",
      critical: true,
    },
    {
      id: "discount_tests_added",
      description:
        "Did the agent add tests to tests/invoice_test.ts covering the discount (a discounted line, rounding to whole cents, or the out-of-range RangeError) and run them passing?",
      critical: true,
    },
    {
      id: "change_still_present",
      description:
        "At the end of the session, does src/invoice.ts in the sandbox still contain the discount change (`discountPct`)?",
      critical: true,
    },
    {
      id: "scratch_tree_removed",
      description:
        "If the agent created a temporary worktree or scratch copy for the parent revision, did it remove it before finishing?",
      critical: false,
    },
  ];
}();
