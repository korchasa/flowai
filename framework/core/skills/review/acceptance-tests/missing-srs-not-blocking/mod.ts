import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

const TRIM_SOURCE = `
// [REF:fr:trim | FR-TRIM]
/** Remove the given characters (default: whitespace) from both ends of a string. */
export function trim(input: string, options: { chars?: string } = {}): string {
  const chars = options.chars;
  if (chars === undefined) return input.trim();
  let start = 0;
  let end = input.length;
  while (start < end && chars.includes(input[start])) start++;
  while (end > start && chars.includes(input[end - 1])) end--;
  return input.slice(start, end);
}
`;

const TRIM_TESTS = `
Deno.test("trim: removes whitespace by default", () => {
  assertEquals(trim("  hi  "), "hi");
});

Deno.test("trim: removes a custom character set from both ends", () => {
  assertEquals(trim(", ,hi, ", { chars: ", " }), "hi");
});

Deno.test("trim: keeps custom characters in the middle", () => {
  assertEquals(trim(",a,b,", { chars: "," }), "a,b");
});
`;

const TASK_FILE = `---
date: 2026-10-07
status: to do
implements: [FR-TRIM]
tags: [strings]
related_tasks: []
---
# Add a configurable trim helper

## Goal

Callers need to strip a custom character set, not only whitespace.

## Definition of Done

- [ ] FR-TRIM: \`trim(input, options?)\` trims whitespace by default and a custom character set when given.
  - Test: \`strings_test.ts::trim: removes a custom character set from both ends\`
  - Evidence: \`deno task check\`

## Solution

Add \`trim\` to \`strings.ts\` with an optional \`chars\` option and cover it in \`strings_test.ts\`.
`;

/**
 * A project whose AGENTS.md declares the requirements lifecycle but whose
 * requirements document does not exist yet. The change under review is a
 * finished, tested helper; its task file names an FR. Observed 2026-10-06 in
 * `ship-full-cycle-success`: the review's FR Coverage Audit returned
 * `Request Changes` because the absent document gave the FR "no acceptance
 * reference", while the commit gate of the same template reports a missing
 * document in one line and never blocks on it.
 */
export const ReviewMissingSrsNotBlocking = new class
  extends AcceptanceTestScenario {
  id = "review-missing-srs-not-blocking";
  name = "A missing requirements document does not block the review";
  skill = "review";
  maxSteps = 20;
  stepTimeoutMs = 420_000;
  agentsTemplateVars = {
    PROJECT_NAME: "StringUtils",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };
  interactive = true;

  override sandboxState = {
    commits: [],
    modified: ["strings.ts", "strings_test.ts"],
    untracked: ["documents/tasks/2026/10/add-trim.md"],
    expectedOutcome:
      "setup() wrote the trim helper, its tests and the task file; the agent reviews them, notes the missing requirements document in one line and approves",
  };

  override async setup(sandboxPath: string) {
    // These edits are the change under review, written by setup(), not by the
    // agent. They stay uncommitted on purpose.
    const src = await Deno.readTextFile(`${sandboxPath}/strings.ts`);
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, src + TRIM_SOURCE);
    const tests = await Deno.readTextFile(`${sandboxPath}/strings_test.ts`);
    await Deno.writeTextFile(
      `${sandboxPath}/strings_test.ts`,
      tests.replace(
        'import { capitalize } from "./strings.ts";',
        'import { capitalize, trim } from "./strings.ts";',
      ) + TRIM_TESTS,
    );
    await Deno.mkdir(`${sandboxPath}/documents/tasks/2026/10`, {
      recursive: true,
    });
    await Deno.writeTextFile(
      `${sandboxPath}/documents/tasks/2026/10/add-trim.md`,
      TASK_FILE,
    );
  }

  userQuery =
    "/review Review my uncommitted change: the new trim helper in strings.ts and its task file.";

  userPersona = `You are a developer who submitted a small change for review.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
Do not create or ask for any documents; answer that the change is ready as it is.
Keep answers brief.`;

  checklist = [
    {
      id: "verdict_approve",
      description:
        "Is the review verdict `Approve` (not `Request Changes`, not `Needs Discussion`)? The trim helper, its three tests and the task file were written by setup() before the run, and `deno task check` passes on them.",
      critical: true,
    },
    {
      id: "missing_srs_not_critical",
      description:
        "Does the report carry NO `[critical]` or otherwise blocking finding whose reason is that the requirements document (`documents/requirements.md`) is absent, or that FR-TRIM therefore has no acceptance reference?",
      critical: true,
    },
    {
      id: "missing_srs_reported",
      description:
        "Does the report or the agent's chat say that the project's requirements document does not exist (for example in a degradation note or a one-line remark)?",
      critical: false,
    },
    {
      id: "no_srs_created",
      description:
        "Did the agent NOT create `documents/requirements.md` or any other requirements document?",
      critical: true,
    },
    {
      id: "no_commit",
      description:
        "Did the agent NOT commit any changes (review only, not commit)?",
      critical: true,
    },
  ];
}();
