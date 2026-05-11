import { join } from "@std/path";
import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Tests that flowai-commit-beta detects a public-surface change (CLI flag
 * rename) and updates affected documentation (SRS FR-CLI-VERBOSE, README) —
 * not just commits the code.
 *
 * Regression trigger: earlier beta runs skipped doc sync after grep'ping docs
 * and concluding "no match". This scenario makes the mismatch literal:
 * SRS and README contain `--verbose` verbatim; src/cli.ts is changed to use
 * `--debug`. The agent must update SRS + README (SDS is nice-to-have).
 */
export const CommitBetaDocSyncGateBench = new class
  extends AcceptanceTestScenario {
  id = "flowai-commit-beta-doc-sync-gate";
  name = "Public-Surface Change Forces Doc Sync";
  skill = "flowai-commit-beta";
  stepTimeoutMs = 420_000;
  maxSteps = 30;
  agentsTemplateVars = {
    PROJECT_NAME: "CliTool",
    TOOLING_STACK: "- TypeScript\n- Deno",
  };

  override sandboxState = {
    commits: [],
    modified: ["src/cli.ts"],
    expectedOutcome:
      "Agent commits the CLI rename AND updates documents/requirements.md + README.md to replace --verbose with --debug",
  };

  override async setup(sandboxPath: string) {
    const renamed = `export function main(argv: string[]): void {
  const debug = argv.includes("--debug");
  const cmd = argv.find((a) => !a.startsWith("--"));
  if (cmd === "run") {
    if (debug) console.log("[debug] starting run");
    console.log("run: ok");
    if (debug) console.log("[debug] done");
    return;
  }
  console.error(\`unknown command: \${cmd}\`);
}
`;
    await Deno.writeTextFile(join(sandboxPath, "src/cli.ts"), renamed);
  }

  userQuery =
    "/flowai-commit-beta I renamed the --verbose CLI flag to --debug in src/cli.ts. Commit the change.";

  checklist = [
    {
      id: "file_committed",
      description:
        "Is src/cli.ts present in the last commit (or among the commits produced in this run)?",
      critical: true,
    },
    {
      id: "srs_updated",
      description:
        "Was documents/requirements.md updated so that FR-CLI-VERBOSE no longer contains the literal string `--verbose` (or was renamed/replaced by `--debug`)? Check the final file content — `grep -c -- '--verbose' documents/requirements.md` should be 0.",
      critical: true,
    },
    {
      id: "readme_updated",
      description:
        "Was README.md updated so it no longer contains the literal string `--verbose`? `grep -c -- '--verbose' README.md` should be 0.",
      critical: true,
    },
    {
      id: "sds_updated",
      description:
        "Was documents/design.md updated to reflect the rename (either `--debug` replaces `--verbose` or the flag section is rewritten)? Nice-to-have, not strictly required if SRS + README cover the change.",
      critical: false,
    },
    {
      id: "audit_report",
      description:
        "Did the agent output a per-document audit report (e.g., `requirements.md: updated`, `README.md: updated`, `design.md: updated|no changes — reason`)? A short bullet list per doc is sufficient.",
      critical: false,
    },
    {
      id: "clean_status",
      description: "Is the final `git status` clean (all changes committed)?",
      critical: true,
    },
  ];
}();
