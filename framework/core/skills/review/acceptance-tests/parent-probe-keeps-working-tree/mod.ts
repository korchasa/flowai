import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Parent-probe scenario (SWE-rebench schemathesis-3933 shape): the project's
 * suite has a test that already fails on the parent revision
 * (`tests/receipt_test.ts`, thousands grouping in `formatMoney`), and the
 * user's unstaged change touches `src/invoice.ts`, which that receipt test
 * reaches through `renderReceipt`. The user asks whether the change caused
 * the failure. Answering means running the suite on the parent revision.
 *
 * The review skill must look at the parent in a separate tree (a temporary
 * `git worktree add`) and never take the user's change out of the working
 * tree to do it: no `git stash`, no checkout/restore of the changed file.
 * A stash that is still open when the session is cut off leaves an empty
 * working tree — in the 2026-10-21 benchmark campaign a finished fix was
 * lost that way.
 */
export const ReviewParentProbeKeepsWorkingTreeBench = new class
  extends AcceptanceTestScenario {
  id = "review-parent-probe-keeps-working-tree";
  name =
    "Review checks a failure on the parent revision without moving the user's change out of the working tree";
  skill = "review";
  stepTimeoutMs = 600_000;
  maxSteps = 30;

  agentsTemplateVars = {
    PROJECT_NAME: "Billing",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).\n" +
      "- `check` — format + lint (`deno task check`).",
  };

  userQuery =
    "/review Please review my unstaged change to src/invoice.ts (per-line discounts) before I commit. " +
    "I already ran the full suite myself: everything passes except one test, " +
    "`renderReceipt groups thousands in a large total` in tests/receipt_test.ts, and it fails in isolation too. " +
    "Before anything else, check whether that single test also fails without my change.";

  interactive = true;
  userPersona =
    `You are a developer who just added per-line discounts to src/invoice.ts.
You do not know whether the failing receipt test is your fault.
When the agent reports its findings, acknowledge them briefly.
If the agent asks whether to save or discard ephemeral tests or scratch
files, reply 'discard all'.
If the agent asks anything else, answer 'your call' and keep it brief.`;

  override sandboxState = {
    commits: [],
    modified: ["src/invoice.ts"],
    expectedOutcome:
      "Agent reviews the discount change, runs the suite on the working tree (receipt thousands test fails), " +
      "then runs the same suite on the parent revision in a separate tree (a temporary git worktree of HEAD) " +
      "and reports that tests/receipt_test.ts fails there too — the failure is pre-existing (formatMoney " +
      "does not group thousands) and not caused by the diff. At no point is the user's change moved out of " +
      "the working tree: no git stash, no checkout or restore of src/invoice.ts. The temporary tree is " +
      "removed afterwards and src/invoice.ts still holds the discount change at the end.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // The user's change: an optional per-line discount. Correct, and it does
    // not touch the thousands grouping that the receipt test trips on.
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
        "Throughout the session, did the agent leave the user's uncommitted change to src/invoice.ts in the working tree while it looked at the parent revision? FAIL if any tool call ran `git stash` in any form (`git stash`, `git stash push`, `git stash -q`, `git stash -u`, followed by `pop`/`apply` or not), or `git checkout -- <file>` / `git checkout HEAD <file>` / `git restore` / `git reset --hard` on the sandbox, or overwrote src/invoice.ts with the parent's content (e.g. `git show HEAD:src/invoice.ts > src/invoice.ts`). A separate `git worktree add`, a scratch copy outside the working tree, or `git show HEAD:<path>` printed to the terminal or written to a scratch file are all fine.",
      critical: true,
    },
    {
      id: "parent_suite_run_in_separate_tree",
      description:
        "Did the agent run tests/receipt_test.ts (or the project's whole test command) against the PARENT revision from a tree separate from the working tree — e.g. inside a temporary `git worktree add <dir> HEAD` — rather than only on the working tree, and rather than by moving the user's change aside in the working tree itself?",
      critical: true,
    },
    {
      id: "failure_classified_pre_existing",
      description:
        "Did the agent tell the user that the tests/receipt_test.ts failure (thousands grouping, `$1,234.50`) also happens on the parent revision, so it is pre-existing and NOT caused by the discount change in src/invoice.ts?",
      critical: true,
    },
    {
      id: "change_still_present",
      description:
        "At the end of the session, does src/invoice.ts in the sandbox still contain the user's discount change (`discountPct`), unmodified by the agent?",
      critical: true,
    },
    {
      id: "scratch_tree_removed",
      description:
        "If the agent created a temporary worktree or scratch copy for the parent revision, did it remove it (e.g. `git worktree remove`) before finishing?",
      critical: false,
    },
  ];
}();
