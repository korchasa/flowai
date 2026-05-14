import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Audit a well-formed memex: deterministic check passes with 0 issues,
 * but the agent still produces a report and a log entry.
 */
export const MemexAuditCleanBench = new class extends AcceptanceTestScenario {
  id = "flowai-memex-audit-clean";
  name = "Audit clean memex — 0 issues, report saved, log appended";
  skill = "flowai-memex-audit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent runs deterministic audit, reports 0 (or near-0) issues, writes a report to outputs/reports/, appends an audit entry to log.md",
  };

  userQuery = "/flowai-memex-audit";

  checklist = [
    {
      id: "audit_executed",
      description:
        "Did the agent run the deterministic audit check (either via the bundled script or by reproducing its logic)?",
      critical: true,
    },
    {
      id: "zero_or_near_zero_issues",
      description:
        "Did the agent report 0 issues (or at most 1 minor structural issue such as a missing outputs/reports/ directory)?",
      critical: true,
    },
    {
      id: "report_written",
      description:
        "Was an audit report file created at `outputs/reports/YYYY-MM-DD-audit.md`?",
      critical: true,
    },
    {
      id: "log_appended",
      description:
        "Was `log.md` appended with a `## [YYYY-MM-DD] audit | ...` entry while preserving the existing 2026-04-25 save entry?",
      critical: true,
    },
    {
      id: "no_unsolicited_writes",
      description:
        "Without `--fix`, did the agent leave existing memex pages untouched (only writing the report and appending to log.md)?",
      critical: true,
    },
  ];
}();
