import { AcceptanceTestScenario } from "@acceptance-tests/types.ts";

/**
 * Audit a memex with deliberate defects + apply --fix.
 *
 * Fixture issues (as reported by the deterministic script):
 *  - DEAD_LINK: [[never-created-page]] in markdown.md
 *  - DEAD_LINK + INDEX_DEAD: [[ghost-page]] in index.md (file missing)
 *  - INDEX_MISSING: lonely-page.md, orphan-island.md
 *  - MISSING_SECTION: markdown.md, orphan-island.md (concept lacks gaps)
 *  - ORPHAN: lonely-page.md, markdown.md (no inbound from content pages)
 *
 * Auto-fixes that should fire (per skill rules):
 *  - Stub pages for dead links (`never-created-page.md`, `ghost-page.md`)
 *  - Missing section appended to markdown.md and orphan-island.md
 *  - INDEX_MISSING entries appended; INDEX_DEAD row removed.
 *  - ORPHAN reported, NOT auto-fixed.
 */
export const MemexAuditDefectsBench = new class extends AcceptanceTestScenario {
  id = "flowai-memex-audit-defects";
  name = "Audit defective memex with --fix applies trivial auto-fixes";
  skill = "flowai-memex-audit";
  stepTimeoutMs = 300_000;
  agentsTemplateVars = {
    PROJECT_NAME: "MemexSandbox",
    TOOLING_STACK: "- Markdown",
  };

  override sandboxState = {
    commits: [],
    expectedOutcome:
      "Agent runs deterministic audit, auto-fixes dead links (stubs), missing sections, and index drift; reports orphans without auto-deleting; writes report; appends log",
  };

  userQuery = "/flowai-memex-audit --fix";

  checklist = [
    {
      id: "audit_executed",
      description:
        "Did the agent run the deterministic audit check and surface multiple issue kinds (dead link, orphan, missing section, index drift)?",
      critical: true,
    },
    {
      id: "dead_link_detected",
      description:
        "Did the agent report the dead `[[never-created-page]]` link in `markdown.md`?",
      critical: true,
    },
    {
      id: "stub_for_dead_link",
      description:
        "Was a stub page created for the dead link target (e.g., `pages/never-created-page.md`) so the wikilink resolves?",
      critical: true,
    },
    {
      id: "missing_section_fixed",
      description:
        "Was a `## Counter-Arguments and Gaps` section appended to `pages/markdown.md` (and `pages/orphan-island.md`) instead of leaving them broken?",
      critical: true,
    },
    {
      id: "index_drift_fixed",
      description:
        "Was the dead `[[ghost-page]]` row removed from `pages/index.md` AND the missing entries (`[[lonely-page]]` and `[[orphan-island]]`) added?",
      critical: true,
    },
    {
      id: "orphan_listed_not_deleted",
      description:
        "Did the agent surface `lonely-page.md` as an orphan in the report WITHOUT auto-deleting it?",
      critical: true,
    },
    {
      id: "report_written",
      description:
        "Was an audit report file created at `outputs/reports/YYYY-MM-DD-audit.md` with sections for issues, auto-fixes, and suggestions?",
      critical: true,
    },
    {
      id: "log_appended",
      description:
        "Was `log.md` appended with a `## [YYYY-MM-DD] audit | <count> issues, <count> auto-fixed` entry while preserving the existing 2026-04-22 entry?",
      critical: true,
    },
    {
      id: "no_raw_modifications",
      description:
        "Did the agent leave files in `raw/` untouched (raw is immutable)?",
      critical: false,
    },
  ];
}();
