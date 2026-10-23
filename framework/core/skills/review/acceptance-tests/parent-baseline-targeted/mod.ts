import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Parent-baseline cost scenario for `review` (SWE-rebench Sonnet campaign
 * 2026-10-21: the review turn of the flowai arm ran the repository's whole
 * suite 35 times over 45 sessions, part of it on the parent revision for the
 * JiT baseline; those suites are red before any change, so the baseline also
 * switched the JiT subset off).
 *
 * The fixture's suite holds a slow ledger test (about 20 s) that fails before
 * any change and has nothing to do with invoices. The user's unstaged change
 * adds per-line discounts to `src/invoice.ts` with tests. The parent baseline
 * must run the test modules that cover the changed symbols
 * (`tests/invoice_test.ts`, `tests/receipt_test.ts` through `renderReceipt`),
 * find them green, and keep the JiT subset on; the unrelated ledger failure is
 * no reason to switch it off.
 */
export const ReviewParentBaselineTargeted = new class
  extends AcceptanceTestScenario {
  id = "review-parent-baseline-targeted";
  name =
    "Review runs the covering test modules, not the whole suite, on the parent revision";
  skill = "review";
  stepTimeoutMs = 600_000;
  maxSteps = 35;

  agentsTemplateVars = {
    PROJECT_NAME: "Billing",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).\n" +
      "- `check` — format + lint (`deno task check`).",
  };

  userQuery =
    "/review Please review my unstaged change (per-line discounts in src/invoice.ts, with tests) before I commit.";

  interactive = true;
  userPersona = `You are a developer who just added per-line discounts.
When the agent reports its findings, acknowledge them briefly.
If the agent asks whether to save or discard ephemeral tests or scratch
files, reply 'discard all'.
If the agent asks anything else, answer 'your call' and keep it brief.`;

  override sandboxState = {
    commits: [],
    modified: ["src/invoice.ts", "tests/invoice_test.ts"],
    expectedOutcome:
      "Agent reviews the discount change. For the JiT parent baseline it creates a separate tree of the parent " +
      "revision and runs there the test modules that cover the changed symbols (tests/invoice_test.ts, " +
      "tests/receipt_test.ts), not the whole suite; they pass, so the JiT subset runs and its probes are checked " +
      "against the parent tree. The slow ledger test fails on the working tree and is unrelated to the diff.",
  };

  override async setup(sandboxDir: string): Promise<void> {
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
    const testsPath = `${sandboxDir}/tests/invoice_test.ts`;
    const tests = await Deno.readTextFile(testsPath);
    await Deno.writeTextFile(
      testsPath,
      tests.replace(
        `import { assertEquals } from "@std/assert";`,
        `import { assertEquals, assertThrows } from "@std/assert";`,
      ) + `
Deno.test("lineTotal applies a percent discount", () => {
  assertEquals(lineTotal({ qty: 2, unitCents: 1000, discountPct: 25 }), 1500);
});

Deno.test("lineTotal rejects an out-of-range discount", () => {
  assertThrows(
    () => lineTotal({ qty: 1, unitCents: 100, discountPct: 120 }),
    RangeError,
  );
});
`,
    );
  }

  checklist = [
    {
      id: "parent_run_targeted",
      description:
        "In the tree of the PARENT revision (a temporary `git worktree add` or a scratch copy), did the agent run test modules that cover the changed code — tests/invoice_test.ts and/or tests/receipt_test.ts, named on the command line — rather than the whole suite? FAIL if any command run in the parent tree was `deno task test`, `deno task check` followed by tests, `deno test` with no file, or `deno test tests/` (the directory), and FAIL if nothing was run in a parent tree at all.",
      critical: true,
    },
    {
      id: "jit_kept_on",
      description:
        "Did the JiT subset run — at least one ephemeral catching/probe test was written and run against the parent tree — instead of the report saying JiT was disabled because the parent baseline was red?",
      critical: true,
    },
    {
      id: "ledger_failure_unrelated",
      description:
        "If the agent ran the slow ledger test, did it describe its failure as unrelated to the discount change (not as a regression the diff caused)?",
      critical: false,
    },
    {
      id: "change_still_present",
      description:
        "At the end, does src/invoice.ts still contain the user's discount change (`discountPct`), unmodified by the agent?",
      critical: true,
    },
  ];
}();
