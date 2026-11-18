import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";
import { runGit } from "@acceptance-tests/utils.ts";

const IGNORED = [".claude/", ".codex/", ".opencode/", ".cursor/"];
const DENO_JSON = JSON.stringify(
  {
    imports: { "@std/assert": "jsr:@std/assert@^1.0.0" },
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

const PARENT_SOURCE = `// [REF:fr:capitalize] — capitalize helper.
/** Capitalize the first letter of a string. */
export const capitalize = (s: string): string => {
  const [first = "", ...rest] = s;
  return first.toUpperCase() + rest.join("");
};
`;

const PARENT_TESTS = `import { assertEquals } from "@std/assert";
import { capitalize } from "./strings.ts";

Deno.test("capitalize: uppercases the first letter", () => {
  assertEquals(capitalize("hello"), "Hello");
});
`;

const PARENT_SRS = `# SRS

## 3. Functional Reqs

### 3.1 FR-CAPITALIZE: Capitalize helper [ANC:fr:capitalize]

- **Desc:** \`capitalize(s)\` uppercases the first letter of a string.
- **Rationale:** UI labels arrive in lower case from the API and must be shown capitalized.
- **Acceptance:** \`strings_test.ts::capitalize: uppercases the first letter\`
- **Status:** [x]
`;

// The task that decided FR-TRIM: its Overview names the problem and the
// alternative it beat, so a link to it is a complete rationale.
const TRIM_TASK = `---
date: 2026-11-10
status: done
implements:
  - FR-TRIM
---
# Configurable trim [ANC:task:2026-11-configurable-trim]

## Goal

Clean values in the CSV export.

## Overview

### Context

The CSV export pads values with commas and spaces (\`", ,Alice, "\`), and the
built-in \`String.prototype.trim\` removes whitespace only, so the padding
reaches the spreadsheet. We weighed a regular expression at each of the six
export call sites against one helper with a configurable character set, and
chose the helper: six copies of a regex drift apart, and one of them had
already dropped the trailing comma.

## Definition of Done

- [x] FR-TRIM: \`trim\` removes a custom character set from both ends.

## Solution

Add \`trim(input, { chars })\` to \`strings.ts\`.
`;

// The task behind FR-SLUG only records the work done. It names no problem
// and no alternative, so a link to it states no reason.
const SLUG_TASK = `---
date: 2026-11-12
status: done
implements:
  - FR-SLUG
---
# Add slugify helper [ANC:task:2026-11-add-slugify]

## Goal

Add a slugify helper.

## Overview

### Context

Added \`slugify\` to \`strings.ts\` with tests.

## Definition of Done

- [x] FR-SLUG: \`slugify\` is implemented and tested.

## Solution

Write the function and two tests.
`;

const NEW_SRS_SECTIONS = `
### 3.2 FR-TRIM: Configurable trim [ANC:fr:trim]

- **Desc:** \`trim(input, options?)\` removes whitespace from both ends of a string by default, and the characters listed in \`options.chars\` when given.
- **Rationale:** see [REF:task:2026-11-configurable-trim | configurable-trim]
- **Acceptance:** \`strings_test.ts::trim: removes a custom character set from both ends\`
- **Status:** [x]

### 3.3 FR-SLUG: Slugify [ANC:fr:slug]

- **Desc:** \`slugify(s)\` lower-cases a string and joins its words with hyphens.
- **Rationale:** see [REF:task:2026-11-add-slugify | add-slugify]
- **Acceptance:** \`strings_test.ts::slugify: joins words with hyphens\`
- **Status:** [x]
`;

const NEW_SOURCE = `
// [REF:fr:trim] — configurable trim helper.
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

// [REF:fr:slug] — slugify helper.
/** Lower-case a string and join its words with hyphens. */
export const slugify = (s: string): string =>
  s.trim().toLowerCase().split(/\\s+/).join("-");
`;

const NEW_TESTS = `
Deno.test("trim: removes whitespace by default", () => {
  assertEquals(trim("  hi  "), "hi");
});

Deno.test("trim: removes a custom character set from both ends", () => {
  assertEquals(trim(", ,hi, ", { chars: ", " }), "hi");
});

Deno.test("slugify: joins words with hyphens", () => {
  assertEquals(slugify(" Hello Big World "), "hello-big-world");
});
`;

/**
 * FR-DOCS.RATIONALE: a `**Rationale:**` may be a link to the task that states
 * the reason, instead of a sentence — but only when that task names the
 * reason for this choice. The diff adds two FR sections whose rationale is a
 * task REF. FR-TRIM links a task whose Overview names the problem and the
 * alternative it beat; FR-SLUG links a task that only records the work done.
 * The review must accept the first link and report the second as a missing
 * rationale. An agent that rejects every link fails `trim_ref_accepted`; an
 * agent that accepts every link fails `slug_ref_flagged`.
 */
export const ReviewRationaleTaskRef = new class extends AcceptanceTestScenario {
  id = "review-rationale-task-ref";
  name =
    "A Rationale that links a task counts only when the task states the reason";
  skill = "review";
  maxSteps = 25;
  stepTimeoutMs = 600_000;
  agentsTemplateVars = {
    PROJECT_NAME: "StringUtils",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `check` — format, lint and test (`deno task check`).",
  };
  interactive = true;

  override sandboxState = {
    commits: [{
      message: "Add capitalize helper, SRS and task files",
      files: [
        "deno.json",
        "strings.ts",
        "strings_test.ts",
        "documents/requirements.md",
        "documents/tasks/2026/11/configurable-trim.md",
        "documents/tasks/2026/11/add-slugify.md",
      ],
    }],
    modified: ["strings.ts", "strings_test.ts", "documents/requirements.md"],
    expectedOutcome:
      "setup() committed the capitalize helper, an SRS and two task files, then wrote uncommitted trim and slugify helpers, their tests and two FR sections whose Rationale is a task link; the agent accepts the link for FR-TRIM, reports FR-SLUG's link as stating no reason, and does not approve",
  };

  override async setup(sandboxPath: string) {
    const tasksDir = `${sandboxPath}/documents/tasks/2026/11`;
    await Deno.mkdir(tasksDir, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/deno.json`, DENO_JSON);
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, PARENT_SOURCE);
    await Deno.writeTextFile(`${sandboxPath}/strings_test.ts`, PARENT_TESTS);
    await Deno.writeTextFile(
      `${sandboxPath}/documents/requirements.md`,
      PARENT_SRS,
    );
    await Deno.writeTextFile(`${tasksDir}/configurable-trim.md`, TRIM_TASK);
    await Deno.writeTextFile(`${tasksDir}/add-slugify.md`, SLUG_TASK);
    await runGit(sandboxPath, [
      "add",
      "deno.json",
      "strings.ts",
      "strings_test.ts",
      "documents/requirements.md",
      "documents/tasks/2026/11/configurable-trim.md",
      "documents/tasks/2026/11/add-slugify.md",
    ]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Add capitalize helper, SRS and task files",
    ]);

    // The change under review, left uncommitted.
    await Deno.writeTextFile(
      `${sandboxPath}/strings.ts`,
      PARENT_SOURCE + NEW_SOURCE,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/strings_test.ts`,
      PARENT_TESTS.replace(
        'import { capitalize } from "./strings.ts";',
        'import { capitalize, slugify, trim } from "./strings.ts";',
      ) + NEW_TESTS,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/documents/requirements.md`,
      PARENT_SRS + NEW_SRS_SECTIONS,
    );
  }

  userQuery =
    "/review Review my uncommitted change: the new trim and slugify helpers, their tests and their requirements in the SRS.";

  userPersona = `You are a developer who submitted a small change for review.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
Do not volunteer anything about the SRS format. If the agent asks whether to save
or discard ephemeral tests it wrote, reply: 'discard all'. Keep answers brief.`;

  checklist = [
    {
      id: "trim_ref_accepted",
      description:
        "Does the review raise NO missing-rationale finding against FR-TRIM? Its `**Rationale:**` is a link to the task `configurable-trim`, whose Overview names the problem (the CSV padding the built-in trim cannot remove) and the alternative it beat (a regex at each call site). A finding that FR-TRIM has no rationale, or that a task link cannot serve as one, fails this item.",
      critical: true,
    },
    {
      id: "slug_ref_flagged",
      description:
        "Does the review report a `[critical]` (or otherwise blocking) finding that FR-SLUG has no real rationale, because its `**Rationale:**` links the task `add-slugify`, which only records the work done and names no reason for the requirement? A finding about anything else does not count.",
      critical: true,
    },
    {
      id: "verdict_not_approve",
      description:
        "Is the review verdict NOT `Approve` (for example `Request Changes`)? The code and tests are correct; only FR-SLUG's missing reason stands in the way.",
      critical: true,
    },
    {
      id: "no_srs_edit",
      description:
        "Did the agent leave `documents/requirements.md` and both task files exactly as setup() wrote them? The review reports; it does not write the missing reason itself.",
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
