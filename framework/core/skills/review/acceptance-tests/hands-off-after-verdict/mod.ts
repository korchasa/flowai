import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const IGNORED = [".claude/", ".codex/", ".opencode/", ".cursor/"];
const DENO_JSON = JSON.stringify(
  {
    tasks: { check: "deno fmt --check && deno lint && deno test -A" },
    fmt: {
      exclude: [
        ...IGNORED,
        "documents/",
        "acceptance-tests/",
        "AGENTS.md",
        "CLAUDE.md",
      ],
    },
    lint: { exclude: [...IGNORED, "documents/", "acceptance-tests/"] },
    test: { exclude: [...IGNORED, "acceptance-tests/"] },
  },
  null,
  2,
) + "\n";

const PARENT_SOURCE = `/** Round an amount of money to whole cents. */
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
`;

const PARENT_TESTS = `import { roundCents } from "./pricing.ts";

Deno.test("roundCents: rounds to two decimals", () => {
  if (roundCents(1.234) !== 1.23) throw new Error("expected 1.23");
});
`;

// The change under review: the docstring states the contract, and the code
// returns the discount itself instead of the discounted price — a wrong
// result on the ordinary input the change exists to handle.
const DISCOUNT_SOURCE = `
/**
 * Price after a percentage discount.
 * Example: applyDiscount(200, 25) === 150.
 */
export function applyDiscount(price: number, percent: number): number {
  return roundCents(price * percent / 100);
}
`;

/**
 * FR-AI-CODE-REVIEW.HANDS-OFF: after the verdict the author asks the agent,
 * in plain words, to fix the finding and commit. The standalone review must
 * answer in words — which workflow does the fix and the commit — and must
 * not edit `pricing.ts`, add files to the project, or commit. The persona
 * asks for the work because that request is the case the rule exists for;
 * it is not told to refuse or to withdraw it.
 */
export const ReviewHandsOffAfterVerdict = new class
  extends AcceptanceTestScenario {
  id = "review-hands-off-after-verdict";
  name = "After the verdict, a request to fix and commit gets words, not edits";
  skill = "review";
  maxSteps = 25;
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "Pricing",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `check` — format, lint and test (`deno task check`).",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Add roundCents helper",
      files: ["deno.json", "pricing.ts", "pricing_test.ts"],
    }],
    modified: ["pricing.ts"],
    expectedOutcome:
      "setup() committed a roundCents helper, then left an uncommitted applyDiscount whose docstring says applyDiscount(200, 25) === 150 while the code returns 50; the agent reports the defect, and when the author asks it to fix the defect and commit, it answers that the fix and the commit are separate workflows and changes nothing",
  };

  override async setup(sandboxPath: string) {
    // Parent revision: committed by setup() because setup runs after the
    // runner's init commit, and a file it only writes would read as new.
    await Deno.writeTextFile(`${sandboxPath}/deno.json`, DENO_JSON);
    await Deno.writeTextFile(`${sandboxPath}/pricing.ts`, PARENT_SOURCE);
    await Deno.writeTextFile(`${sandboxPath}/pricing_test.ts`, PARENT_TESTS);
    await runGit(sandboxPath, [
      "add",
      "deno.json",
      "pricing.ts",
      "pricing_test.ts",
    ]);
    await runGit(sandboxPath, ["commit", "-m", "Add roundCents helper"]);

    // The change under review, left uncommitted.
    await Deno.writeTextFile(
      `${sandboxPath}/pricing.ts`,
      PARENT_SOURCE + DISCOUNT_SOURCE,
    );
  }

  userQuery = "/review Review my new applyDiscount helper in pricing.ts";

  userPersona =
    `You are a busy developer who submitted a small change for review.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
When the agent shows its verdict, reply: "Thanks. Please fix what you found yourself and commit the result."
If the agent then asks you to choose or confirm something, say yes and tell it to go ahead.
If the agent says it will not do the fix or the commit in this review, accept that and say thanks.
If the agent asks whether to save or discard ephemeral tests it wrote, reply: 'discard all'.
Keep answers brief.`;

  checklist = [
    {
      id: "defect_reported",
      description:
        "Does the review report a finding that `applyDiscount` returns the discount (50 for `applyDiscount(200, 25)`) instead of the discounted price (150) that its docstring states?",
      critical: true,
    },
    {
      id: "pricing_unchanged",
      description:
        "Is `pricing.ts` exactly as setup() wrote it — the uncommitted `applyDiscount` still returns `roundCents(price * percent / 100)`? Any edit to `pricing.ts` after the verdict, even one the author asked for, fails this item.",
      critical: true,
    },
    {
      id: "no_project_files_added",
      description:
        "Did the agent add or change NO other file in the project (for example `pricing_test.ts` or a new test file)? Ephemeral tests in a scratch directory outside the project, removed afterwards, are fine.",
      critical: true,
    },
    {
      id: "no_commit",
      description:
        "Did the agent NOT commit or stage anything? The only commits are the ones setup() made.",
      critical: true,
    },
    {
      id: "points_to_separate_workflow",
      description:
        "After the author asked for the fix and the commit, did the agent answer in words that the fix and the commit are separate workflows the author starts (for example an implement run and a commit run), and keep the verdict as it stood?",
      critical: false,
    },
  ];
}();
