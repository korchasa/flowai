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

const NEW_SRS_SECTION = `
### 3.2 FR-TRIM: Configurable trim [ANC:fr:trim]

- **Desc:** \`trim(input, options?)\` removes whitespace from both ends of a string by default, and the characters listed in \`options.chars\` when given.
- **Acceptance:** \`strings_test.ts::trim: removes a custom character set from both ends\`
- **Status:** [x]
`;

const TRIM_SOURCE = `
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
`;

const TRIM_TESTS = `
Deno.test("trim: removes whitespace by default", () => {
  assertEquals(trim("  hi  "), "hi");
});

Deno.test("trim: removes a custom character set from both ends", () => {
  assertEquals(trim(", ,hi, ", { chars: ", " }), "hi");
});
`;

/**
 * FR-DOCS.RATIONALE: the diff adds a new FR section to the SRS that has a
 * description, a runnable acceptance reference, a status and a code marker,
 * but no `**Rationale:**` line. The implementation and its tests are correct
 * and `deno task check` passes, so the missing reason is the only defect.
 * The project's AGENTS.md is rendered from the shipped template, which
 * declares the rule; the review's FR Coverage Audit must report the missing
 * field as a blocking finding. The parent FR-CAPITALIZE already carries its
 * rationale, so the finding can only point at the new section.
 */
export const ReviewMissingRationaleBlocks = new class
  extends AcceptanceTestScenario {
  id = "review-missing-rationale-blocks";
  name = "A new FR without a Rationale field blocks the review";
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
      message: "Add capitalize helper and SRS",
      files: [
        "deno.json",
        "strings.ts",
        "strings_test.ts",
        "documents/requirements.md",
      ],
    }],
    modified: ["strings.ts", "strings_test.ts", "documents/requirements.md"],
    expectedOutcome:
      "setup() committed the capitalize helper and an SRS, then wrote an uncommitted trim helper, its tests and a new FR-TRIM section without a Rationale field; the agent reviews the diff, reports the missing rationale as a blocking finding and does not approve",
  };

  override async setup(sandboxPath: string) {
    // Parent revision: committed by setup() because setup runs after the
    // runner's init commit, and a file it only writes would read as new.
    await Deno.mkdir(`${sandboxPath}/documents`, { recursive: true });
    await Deno.writeTextFile(`${sandboxPath}/deno.json`, DENO_JSON);
    await Deno.writeTextFile(`${sandboxPath}/strings.ts`, PARENT_SOURCE);
    await Deno.writeTextFile(`${sandboxPath}/strings_test.ts`, PARENT_TESTS);
    await Deno.writeTextFile(
      `${sandboxPath}/documents/requirements.md`,
      PARENT_SRS,
    );
    await runGit(sandboxPath, [
      "add",
      "deno.json",
      "strings.ts",
      "strings_test.ts",
      "documents/requirements.md",
    ]);
    await runGit(sandboxPath, [
      "commit",
      "-m",
      "Add capitalize helper and SRS",
    ]);

    // The change under review, left uncommitted.
    await Deno.writeTextFile(
      `${sandboxPath}/strings.ts`,
      PARENT_SOURCE + TRIM_SOURCE,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/strings_test.ts`,
      PARENT_TESTS.replace(
        'import { capitalize } from "./strings.ts";',
        'import { capitalize, trim } from "./strings.ts";',
      ) + TRIM_TESTS,
    );
    await Deno.writeTextFile(
      `${sandboxPath}/documents/requirements.md`,
      PARENT_SRS + NEW_SRS_SECTION,
    );
  }

  userQuery =
    "/review Review my uncommitted change: the new trim helper, its tests and its requirement in the SRS.";

  userPersona = `You are a developer who submitted a small change for review.
When the agent asks questions or proposes a review plan, confirm and let it proceed.
Do not volunteer anything about the SRS format. If the agent asks whether to save
or discard ephemeral tests it wrote, reply: 'discard all'. Keep answers brief.`;

  checklist = [
    {
      id: "missing_rationale_flagged",
      description:
        "Does the review report carry a `[critical]` (or otherwise blocking) finding that the new requirement FR-TRIM in `documents/requirements.md` has no `**Rationale:**` field — that is, it does not state why the requirement exists? A finding about anything else does not count.",
      critical: true,
    },
    {
      id: "verdict_not_approve",
      description:
        "Is the review verdict NOT `Approve` (for example `Request Changes`)? The code and tests are correct; only the missing rationale stands in the way.",
      critical: true,
    },
    {
      id: "capitalize_not_flagged",
      description:
        "Does the report raise NO rationale finding against FR-CAPITALIZE, which already has a `**Rationale:**` line?",
      critical: false,
    },
    {
      id: "no_srs_edit",
      description:
        "Did the agent leave `documents/requirements.md` exactly as setup() wrote it? The review reports; it does not add the missing field itself.",
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
