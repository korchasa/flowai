import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * The diff deletes a CLI subcommand that the project's own SRS still tells the
 * maintainer to run. Review must NAME that drift as a finding — and must grade
 * it a warning, not a critical, so the verdict stays Approve.
 *
 * Why the severity matters: in the `review-and-commit` composite the commit
 * phase owns Documentation Sync. If stale docs escalated to critical, the
 * verdict gate would stop the workflow before the very step designed to fix
 * them, and the doc sync could never run. But silence is equally wrong — the
 * SRS would keep instructing a reader to run a command that no longer exists.
 */
export const ReviewDocDriftIsWarningBench = new class
  extends AcceptanceTestScenario {
  id = "review-doc-drift-is-warning";
  name = "Review flags doc-code drift as a warning, not a blocker";
  skill = "review";
  stepTimeoutMs = 600_000;
  maxSteps = 25;

  agentsTemplateVars = {
    PROJECT_NAME: "ReportKit",
    TOOLING_STACK: "- TypeScript\n- Deno",
    DEVELOPMENT_COMMANDS:
      "- `test` — run the project test suite (`deno task test`).",
  };

  userQuery =
    "/review I removed the retired `export` subcommand from the CLI. Please review my unstaged changes.";

  interactive = true;
  userPersona =
    `You are a developer who removed a dead CLI subcommand. You believe the
removal is clean. Answer any question briefly and do NOT volunteer that the SRS
still documents the subcommand — the review is supposed to find that itself.
When the agent asks whether to save or discard any ephemeral tests it wrote,
reply: 'discard all'.`;

  override sandboxState = {
    commits: [],
    modified: ["cli.ts"],
    expectedOutcome:
      "Agent reviews the removal, notices that documents/requirements.md still instructs the maintainer to run `reportkit export`, reports that drift as a warning-severity finding, and still returns Approve because nothing else is wrong.",
  };

  override async setup(sandboxDir: string): Promise<void> {
    // Parent revision ships two subcommands; the diff removes `export`.
    await Deno.writeTextFile(
      `${sandboxDir}/cli.ts`,
      `/** ReportKit CLI. */
export function run(argv: string[]): string {
  const cmd = argv[0];
  if (cmd === "render") return "rendered";
  throw new Error(\`unknown subcommand: \${cmd}\`);
}
`,
    );
    // The SRS is left untouched by the diff — it still names the dead command.
    // This is the drift the review must catch.
    //
    // FR-EXPORT deliberately carries NO completion claim. An FR marked `[x]`
    // whose implementation the diff deletes is `[critical] Phantom completion`
    // under the review skill's FR Coverage Audit, which forbids Approve — so a
    // `[x]` here would put this scenario's expected verdict in direct conflict
    // with that gate, and the agent would be right to reject. The drift under
    // test is stale documentation, nothing else: the Interfaces section still
    // states, as present fact, that the CLI accepts `export`.
    await Deno.mkdir(`${sandboxDir}/documents`, { recursive: true });
    await Deno.writeTextFile(
      `${sandboxDir}/documents/requirements.md`,
      `# SRS

## 3. Functional Reqs

### 3.1 FR-RENDER

- **Desc:** Render a report to stdout.
- **Scenario:** Maintainer runs \`deno task reportkit render\`.
- **Status:** [x]

---

### 3.2 FR-EXPORT

- **Desc:** Export a report to a file.
- **Scenario:** Maintainer runs \`deno task reportkit export --out <path>\`; the
  file appears at the given path.
- **Status:** [ ]

## 5. Interfaces

- **CLI:** \`reportkit\` accepts two subcommands. \`render\` writes the report to
  stdout. \`export --out <path>\` writes it to the given file; run it whenever a
  report has to be archived.
`,
    );
  }

  checklist = [
    {
      id: "drift_detected",
      description:
        "Did the agent NAME the mismatch — that documents/requirements.md (§5 Interfaces) still states the CLI accepts the `export` subcommand which this diff deletes? Merely reading the SRS is not enough; the finding must appear in the report.",
      critical: true,
    },
    {
      id: "drift_is_warning_not_critical",
      description:
        "Was that drift finding graded as a WARNING (or nit), NOT as a critical/blocker? Look at the severity tag on the finding itself.",
      critical: true,
    },
    {
      id: "verdict_approve",
      description:
        "Did the final verdict come out as Approve (or an equivalent positive verdict)? Stale documentation alone must not push the verdict to Request Changes.",
      critical: true,
    },
    {
      id: "no_unrequested_doc_edit",
      description:
        "Did the agent leave documents/requirements.md unmodified? The `review` skill reports; it does not edit documents (that belongs to the commit phase).",
      critical: true,
    },
    {
      id: "no_production_change",
      description:
        "Did the agent leave cli.ts in the exact shape produced by setup() — no restoring the deleted subcommand, no auto-fix?",
      critical: true,
    },
  ];
}();
